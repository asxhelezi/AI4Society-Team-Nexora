// Loaded before each prototype panel to check the live database role.
(function () {
  var expectedRole = document.currentScript.getAttribute('data-role');
  document.documentElement.style.visibility = 'hidden';
  var token = sessionStorage.getItem('sinjal_staff_access') || localStorage.getItem('sinjal_staff_access');
  var destinations = {
    admin: '/admin/', clerk: '/', department_authority: '/department/',
    municipal_authority: '/managerial/', operative_staff: '/field/'
  };
  function signOut() {
    sessionStorage.removeItem('sinjal_staff_access');
    localStorage.removeItem('sinjal_staff_access');
    sessionStorage.removeItem('sinjal_session');
    localStorage.removeItem('sinjal_session');
    location.replace('/login/');
  }
  if (!token) { signOut(); return; }
  fetch('/v1/auth/me', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' })
    .then(function (response) { if (!response.ok) throw new Error('unauthorized'); return response.json(); })
    .then(function (user) {
      if (!destinations[user.role]) { signOut(); return; }
      if (user.role !== expectedRole) { location.replace(destinations[user.role]); return; }
      // Refresh display identity if the account's name or role changed in PostgreSQL.
      var storage = sessionStorage.getItem('sinjal_staff_access') ? sessionStorage : localStorage;
      var displayRoles = {
        admin: ['admin', 'superadmin'], department_authority: ['department_authority', 'manager'],
        municipal_authority: ['municipal_authority', 'management'], operative_staff: ['operative_staff', 'operative']
      };
      storage.setItem('sinjal_session', JSON.stringify({
        app: location.pathname.split('/')[1],
        user: { id: user.id, name: user.full_name, email: user.email,
          department_id: user.department_id, roles: displayRoles[user.role] || [user.role] }
      }));
      document.documentElement.style.visibility = '';
      function hookLogout() {
        if (window.SinjalLayout) {
          window.SinjalLayout.auth.loginUrl = '/login/';
          window.SinjalLayout.auth.onLogout = signOut;
        }
      }
      hookLogout();
      document.addEventListener('DOMContentLoaded', hookLogout, { once: true });
    })
    .catch(signOut);
})();
