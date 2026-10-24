#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <fcntl.h>
#include <io.h>
#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <filesystem>
#include <iostream>
#include <mutex>
#include <queue>
#include <string>
#include <thread>
#include <vector>
#include "vendor/mpv/client.h"
#include "vendor/json.hpp"
using json = nlohmann::json;
namespace fs = std::filesystem;

// libmpv is loaded from the helper directory only. No PATH/current-directory DLL search.
struct Api {
  HMODULE dll = nullptr;
#define FUNCTION(member, symbol) decltype(&symbol) member = nullptr
  FUNCTION(create, mpv_create); FUNCTION(initialize, mpv_initialize);
  FUNCTION(destroy, mpv_terminate_destroy); FUNCTION(option, mpv_set_option_string);
  FUNCTION(command, mpv_command); FUNCTION(set, mpv_set_property_string);
  FUNCTION(get, mpv_get_property); FUNCTION(string, mpv_get_property_string);
  FUNCTION(free, mpv_free); FUNCTION(event, mpv_wait_event);
  FUNCTION(observe, mpv_observe_property); FUNCTION(version, mpv_client_api_version);
#undef FUNCTION
  void load(const fs::path& path) {
    SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_SYSTEM32 | LOAD_LIBRARY_SEARCH_USER_DIRS);
    dll = LoadLibraryExW(path.c_str(), nullptr, LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_SYSTEM32);
    if (!dll) throw std::runtime_error("Cannot load mpv-2.dll or one of its dependencies.");
#define LOAD(member, symbol) member = reinterpret_cast<decltype(member)>(GetProcAddress(dll, #symbol)); if (!member) throw std::runtime_error("libmpv API symbol is missing.")
    LOAD(create, mpv_create); LOAD(initialize, mpv_initialize); LOAD(destroy, mpv_terminate_destroy);
    LOAD(option, mpv_set_option_string); LOAD(command, mpv_command); LOAD(set, mpv_set_property_string);
    LOAD(get, mpv_get_property); LOAD(string, mpv_get_property_string); LOAD(free, mpv_free);
    LOAD(event, mpv_wait_event); LOAD(observe, mpv_observe_property); LOAD(version, mpv_client_api_version);
#undef LOAD
    if ((version() >> 16) != 2) throw std::runtime_error("This helper requires libmpv client API major 2.");
  }
  ~Api() { if (dll) FreeLibrary(dll); }
};
Api api;
mpv_handle* player = nullptr;
HWND host = nullptr, parentWindow = nullptr;
std::mutex queueMutex;
std::queue<json> requests;
std::atomic<bool> inputClosed{false};
bool loaded = false, tracksDirty = true, quitting = false;
std::string failure;
json tracks = json::array();
const UINT ProcessRequest = WM_APP + 1;

void emit(const json& value) { std::cout << value.dump(-1, ' ', false, json::error_handler_t::replace) << '\n' << std::flush; }
void check(int result) { if (result < 0) throw std::runtime_error("Native engine rejected operation (" + std::to_string(result) + ")."); }
void command(const std::vector<std::string>& values) {
  std::vector<const char*> argv; for (const auto& value : values) argv.push_back(value.c_str()); argv.push_back(nullptr);
  check(api.command(player, argv.data()));
}
void set(const char* key, const std::string& value) { check(api.set(player, key, value.c_str())); }
double number(const char* key, double fallback = 0) { double value = fallback; if (api.get(player, key, MPV_FORMAT_DOUBLE, &value) < 0 || !std::isfinite(value)) return fallback; return value; }
bool flag(const char* key, bool fallback = false) { int value = fallback; return api.get(player, key, MPV_FORMAT_FLAG, &value) >= 0 ? value != 0 : fallback; }
std::string text(const char* key, size_t limit = 256) { char* value = api.string(player, key); if (!value) return ""; std::string result(value); api.free(value); if (result.size() > limit) result.resize(limit); return result; }
void refreshTracks() {
  tracks = json::array(); const int count = std::clamp(static_cast<int>(number("track-list/count")), 0, 256);
  for (int i = 0; i < count; i++) {
    const std::string base = "track-list/" + std::to_string(i) + "/";
    const auto type = text((base + "type").c_str()); if (type != "audio" && type != "sub") continue;
    const auto id = static_cast<int>(number((base + "id").c_str())); if (id < 1) continue;
    tracks.push_back({{"id", id}, {"type", type}, {"title", text((base + "title").c_str(), 512)}, {"lang", text((base + "lang").c_str(), 64)}, {"codec", text((base + "codec").c_str(), 128)}, {"selected", flag((base + "selected").c_str())}});
  }
  tracksDirty = false;
}
void snapshot() {
  if (tracksDirty) refreshTracks();
  std::string status = !failure.empty() ? "error" : !loaded ? "loading" : flag("eof-reached") ? "ended" : flag("paused-for-cache") ? "buffering" : flag("pause") ? "paused" : "playing";
  const double pos = std::max(0.0, number("time-pos"));
  emit({{"event", "state"}, {"state", {
    {"status", status}, {"position", pos}, {"duration", std::max(0.0, number("duration"))},
    {"volume", std::clamp(number("volume", 80) / 100.0, 0.0, 1.0)}, {"muted", flag("mute")}, {"rate", std::clamp(number("speed", 1), 0.25, 3.0)},
    {"buffered", pos + std::max(0.0, number("demuxer-cache-duration"))}, {"width", std::max(0.0, number("video-params/w"))}, {"height", std::max(0.0, number("video-params/h"))},
    {"error", failure.empty() ? json(nullptr) : json(failure)}, {"tracks", tracks}, {"videoCodec", text("video-codec")}, {"audioCodec", text("audio-codec-name")}, {"engineVersion", text("mpv-version")},
    {"audioDelay", number("audio-delay")}, {"subtitleDelay", number("sub-delay")}
  }}});
}
void events() {
  for (int i = 0; i < 256; i++) {
    mpv_event* event = api.event(player, 0); if (event->event_id == MPV_EVENT_NONE) break;
    if (event->event_id == MPV_EVENT_FILE_LOADED) { loaded = true; failure.clear(); tracksDirty = true; }
    if (event->event_id == MPV_EVENT_PROPERTY_CHANGE) tracksDirty = true;
    if (event->event_id == MPV_EVENT_END_FILE) {
      auto* end = static_cast<mpv_event_end_file*>(event->data);
      if (end && end->reason == MPV_END_FILE_REASON_ERROR) { failure = "The native engine could not decode or access this media (" + std::to_string(end->error) + ")."; loaded = false; ShowWindow(host, SW_HIDE); }
    }
    if (event->event_id == MPV_EVENT_CLIENT_MESSAGE) {
      auto* message = static_cast<mpv_event_client_message*>(event->data);
      if (message && message->num_args == 2 && std::string(message->args[0]) == "zenplex") {
        const std::string key(message->args[1]);
        if (key == "fullscreen" || key == "toggle" || key == "back" || key == "forward" || key == "mute" || key == "escape") emit({{"event", "shortcut"}, {"shortcut", key}});
      }
    }
  }
}
double bounded(const json& j, const char* name, double low, double high) {
  const double value = j.at(name).get<double>(); if (!std::isfinite(value) || value < low || value > high) throw std::runtime_error("Invalid numeric argument."); return value;
}
std::string inputString(const json& j, const char* name) { const auto value = j.at(name).get<std::string>(); if (value.empty() || value.size() > 32768 || value.find('\0') != std::string::npos) throw std::runtime_error("Invalid string argument."); return value; }
void dispatch(const json& request) {
  const auto id = request.is_object() && request.contains("id") && request["id"].is_number_integer() ? request["id"].get<int64_t>() : 0;
  try {
    const std::string op = request.at("op").get<std::string>();
    if (op == "viewport") {
      const double scale = static_cast<double>(GetDpiForWindow(parentWindow)) / 96.0;
      const auto x = bounded(request, "x", 0, 32768), y = bounded(request, "y", 0, 32768), w = bounded(request, "width", 0, 32768), h = bounded(request, "height", 0, 32768);
      const bool visible = request.at("visible").get<bool>() && w > 0 && h > 0 && failure.empty();
      SetWindowPos(host, HWND_TOP, static_cast<int>(std::lround(x * scale)), static_cast<int>(std::lround(y * scale)), std::max(1, static_cast<int>(std::lround(w * scale))), std::max(1, static_cast<int>(std::lround(h * scale))), SWP_NOACTIVATE | (visible ? SWP_SHOWWINDOW : SWP_HIDEWINDOW));
    } else if (op == "open") {
      if (loaded) throw std::runtime_error("A helper instance owns one source only.");
      const auto source = inputString(request, "source");
      const bool adaptive = request.value("adaptive", false) && source.rfind("https://", 0) == 0;
      set("access-references", adaptive ? "yes" : "no");
      loaded = false; failure.clear(); command({"loadfile", source, "replace"});
    } else if (op == "play") { if (flag("eof-reached")) command({"seek", "0", "absolute+exact"}); set("pause", "no"); }
    else if (op == "pause") set("pause", "yes");
    else if (op == "stop") { set("pause", "yes"); if (loaded) command({"seek", "0", "absolute+exact"}); }
    else if (op == "seek") command({"seek", std::to_string(bounded(request, "value", 0, 1e9)), "absolute+exact"});
    else if (op == "volume") set("volume", std::to_string(bounded(request, "value", 0, 1) * 100));
    else if (op == "mute") set("mute", request.at("value").get<bool>() ? "yes" : "no");
    else if (op == "rate") set("speed", std::to_string(bounded(request, "value", 0.25, 3)));
    else if (op == "audio" || op == "subtitle") {
      const int selected = static_cast<int>(bounded(request, "value", op == "audio" ? 1 : 0, 100000));
      refreshTracks(); bool found = op == "subtitle" && selected == 0;
      for (const auto& track : tracks) if (track["id"] == selected && track["type"] == (op == "audio" ? "audio" : "sub")) found = true;
      if (!found) throw std::runtime_error("Track no longer exists.");
      set(op == "audio" ? "aid" : "sid", selected == 0 ? "no" : std::to_string(selected)); tracksDirty = true;
    } else if (op == "subtitleDelay") set("sub-delay", std::to_string(bounded(request, "value", -60, 60)));
    else if (op == "audioDelay") set("audio-delay", std::to_string(bounded(request, "value", -10, 10)));
    else if (op == "subtitleFile") { command({"sub-add", inputString(request, "path"), "select"}); tracksDirty = true; }
    else if (op == "frameStep") command({"frame-step"});
    else if (op == "fit") {
      const auto fit = inputString(request, "value"); if (fit != "contain" && fit != "cover" && fit != "fill") throw std::runtime_error("Invalid fit.");
      set("keepaspect", fit == "fill" ? "no" : "yes"); set("panscan", fit == "cover" ? "1" : "0");
    } else if (op == "quit") { quitting = true; PostQuitMessage(0); }
    else throw std::runtime_error("Unknown native operation.");
    emit({{"id", id}, {"ok", true}});
  } catch (...) { emit({{"id", id}, {"ok", false}}); }
}
LRESULT CALLBACK windowProc(HWND window, UINT message, WPARAM w, LPARAM l) {
  if (message == ProcessRequest) {
    std::queue<json> batch; { std::lock_guard<std::mutex> lock(queueMutex); requests.swap(batch); }
    while (!batch.empty()) { dispatch(batch.front()); batch.pop(); }
    if (inputClosed) PostQuitMessage(0);
    return 0;
  }
  if (message == WM_TIMER && player) { if (!IsWindow(parentWindow)) { PostQuitMessage(0); return 0; } events(); snapshot(); return 0; }
  if (message == WM_CLOSE) { PostQuitMessage(0); return 0; }
  return DefWindowProcW(window, message, w, l);
}
void readCommands() {
  std::string line; char c;
  while (std::cin.get(c)) {
    if (c != '\n') { if (line.size() >= 65536) break; line += c; continue; }
    try {
      auto request = json::parse(line); line.clear();
      { std::lock_guard<std::mutex> lock(queueMutex); if (requests.size() >= 64) break; requests.push(std::move(request)); }
      if (!PostMessageW(host, ProcessRequest, 0, 0)) break;
    } catch (...) { break; }
  }
  inputClosed = true; PostMessageW(host, ProcessRequest, 0, 0);
}
int main(int argc, char** argv) {
  _setmode(_fileno(stdin), _O_BINARY); _setmode(_fileno(stdout), _O_BINARY);
  try {
    if (argc != 2) throw std::runtime_error("Expected parent HWND.");
    const auto value = std::stoull(argv[1]); parentWindow = reinterpret_cast<HWND>(static_cast<uintptr_t>(value));
    if (!IsWindow(parentWindow)) throw std::runtime_error("Parent window is unavailable.");
    SetThreadDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    wchar_t executable[32768]; const DWORD length = GetModuleFileNameW(nullptr, executable, 32768); if (!length || length >= 32768) throw std::runtime_error("Cannot locate native runtime.");
    const fs::path directory = fs::path(executable).parent_path(); api.load(directory / L"mpv-2.dll");
    WNDCLASSW cls{}; cls.lpfnWndProc = windowProc; cls.hInstance = GetModuleHandleW(nullptr); cls.lpszClassName = L"ZenPlexNativeSurface"; cls.hbrBackground = reinterpret_cast<HBRUSH>(GetStockObject(BLACK_BRUSH)); RegisterClassW(&cls);
    host = CreateWindowExW(0, cls.lpszClassName, L"ZenPlex video", WS_CHILD | WS_CLIPSIBLINGS | WS_CLIPCHILDREN, 0, 0, 1, 1, parentWindow, nullptr, cls.hInstance, nullptr);
    if (!host) throw std::runtime_error("Cannot create native video surface.");
    player = api.create(); if (!player) throw std::runtime_error("Cannot create native engine.");
    auto option = [](const char* name, const char* value) { check(api.option(player, name, value)); };
    option("config", "no"); option("load-scripts", "no"); option("ytdl", "no"); option("osc", "no"); option("terminal", "no"); option("input-default-bindings", "no"); option("input-builtin-bindings", "no"); option("input-vo-keyboard", "yes");
    option("autoload-files", "no"); option("access-references", "no"); option("load-unsafe-playlists", "no"); option("keep-open", "yes"); option("idle", "yes"); option("pause", "yes"); option("vo", "gpu"); option("gpu-context", "d3d11"); option("hwdec", "auto-safe"); option("network-timeout", "15"); option("tls-verify", "yes"); option("osd-level", "0");
    const auto wid = std::to_string(reinterpret_cast<uintptr_t>(host)); option("wid", wid.c_str());
    const auto conf = (directory / L"input.conf").u8string(); option("input-conf", conf.c_str());
    check(api.initialize(player)); check(api.observe(player, 1, "track-list", MPV_FORMAT_NONE));
    SetTimer(host, 1, 125, nullptr); emit({{"event", "ready"}, {"protocol", 1}});
    std::thread reader(readCommands);
    MSG message; while (GetMessageW(&message, nullptr, 0, 0) > 0) { TranslateMessage(&message); DispatchMessageW(&message); }
    KillTimer(host, 1); api.destroy(player); player = nullptr; DestroyWindow(host);
    // stdin is owned by Electron. Cancel a pending synchronous read on clean shutdown.
    if (reader.joinable()) { CancelSynchronousIo(reinterpret_cast<HANDLE>(reader.native_handle())); reader.join(); }
    return 0;
  } catch (const std::exception& error) {
    emit({{"event", "fatal"}, {"message", error.what()}}); if (player) { api.destroy(player); player = nullptr; } return 1;
  }
}
