document.getElementById('requestForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var btn = document.getElementById('submitBtn');
  var successEl = document.getElementById('formSuccess');
  var errorEl = document.getElementById('formError');
  successEl.style.display = 'none';
  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Sending...';
  var payload = {
    name:     document.getElementById('name').value.trim(),
    email:    document.getElementById('email').value.trim(),
    company:  document.getElementById('company').value.trim() || null,
    use_case: document.getElementById('use_case').value.trim() || null,
  };
  try {
    var res = await fetch('/demo/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      document.getElementById('requestForm').style.display = 'none';
      successEl.style.display = 'block';
    } else {
      throw new Error('Server error');
    }
  } catch(err) {
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Request Access \u2192';
  }
});
