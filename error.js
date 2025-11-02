// Read query parameter and update error message and title, and handle all DOM logic for error.html
window.addEventListener('DOMContentLoaded', function() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('query');
  const type = params.get('type');
  if (query) {
    document.getElementById('query-block').textContent = query;
    document.getElementById('query-block').style.display = 'inline-block';
  }
  // Set specific not found message
  if (type === 'name') {
    document.getElementById('error-title').textContent = 'Error: Name not found';
    document.getElementById('error-message').innerHTML = 'The <b>name</b> you entered could not be found in the BNS registry.<br>Please check your spelling or try again later.';
    document.getElementById('extra-message').style.display = '';
    document.getElementById('address-extra-message').style.display = 'none';
  } else if (type === 'invalid') {
    document.getElementById('error-title').textContent = 'Error: Invalid input';
    document.getElementById('error-message').innerHTML = 'Unable to process the .bitmap request. Input contains invalid characters. Only letters, numbers, periods, dashes, underscores, equals signs, and exclamation marks are allowed.';
    document.getElementById('extra-message').style.display = 'none';
    document.getElementById('address-extra-message').style.display = 'none';
  } else if (type === 'address') {
    document.getElementById('error-title').textContent = 'Error: Address not found';
    document.getElementById('error-message').innerHTML = 'The <b>address</b> you entered could not be found in the on-chain index (OCI).';
    document.getElementById('extra-message').style.display = 'none';
    document.getElementById('address-extra-message').style.display = '';
  } else {
    document.getElementById('not-found-msg').textContent = '';
    document.getElementById('extra-message').style.display = '';
    document.getElementById('address-extra-message').style.display = 'none';
  }
});
