(function () {
  var KEY = "archer.currentSession";

  function saveSession(session) {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  }

  function loadSession() {
    var raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function clearSession() {
    window.localStorage.removeItem(KEY);
  }

  window.ArcherStorage = {
    saveSession: saveSession,
    loadSession: loadSession,
    clearSession: clearSession
  };
})();

