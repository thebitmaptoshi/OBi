// Read query parameter and update error message and title
const params = new URLSearchParams(window.location.search);
const query = params.get('query');
const type = params.get('type');
if (query) {
  let message = '';
  let title = '';
  if (type === 'name') {
    title = 'Error: Name not found';
    message = `${query} is NOT currently registered. Please validate availability in mempool if attempting to register. Registry may not be up to block yet.`;
  } else if (type === 'address') {
    title = 'Error: Address not found';
    message = `${query} is NOT currently registered. Please check current blockheight. Registry may not be up to block yet.`;
  } else {
    title = 'Error: Name not found';
    message = `Name not found for the provided .bitmap address.`;
  }
  const errorTitle = document.getElementById('error-title');
  const errorMessage = document.getElementById('error-message');
  if (errorTitle) errorTitle.textContent = title;
  if (errorMessage) errorMessage.innerHTML = message;
}
