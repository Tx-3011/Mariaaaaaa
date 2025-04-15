// Feedback functionality

// Depends on global currentUser, API_URL (defined in main.js/index.html)
// Depends on DOM elements feedbackModal, feedbackErrorElement (defined in main.js)

function showFeedbackModal() {
  if (!currentUser) {
      // Redirect to login or show message if trying to give feedback without login
       alert('Please login to leave feedback.');
       // Optionally, redirect to login: window.location.hash = '#login';
      return;
  }
  if (feedbackModal) {
       // Clear previous errors/values
       hideError(feedbackErrorElement);
       const ratingSelect = document.getElementById('rating');
       const commentText = document.getElementById('feedbackText');
       if(ratingSelect) ratingSelect.value = '';
       if(commentText) commentText.value = '';
       feedbackModal.style.display = 'block';
  }
}

function closeFeedback() {
  if (feedbackModal) feedbackModal.style.display = 'none';
}

async function submitFeedback() {
  hideError(feedbackErrorElement); // Clear previous errors

  if (!currentUser) {
      displayError(feedbackErrorElement, 'Error: You are not logged in.');
      return;
  }

  const ratingElement = document.getElementById('rating');
  const commentElement = document.getElementById('feedbackText');

  const ratingValue = ratingElement ? ratingElement.value : null;
  const comment = commentElement ? commentElement.value.trim() : '';

  if (!ratingValue) {
      displayError(feedbackErrorElement, 'Please select a rating.');
      return;
  }

  // Convert rating string ("5", "4", etc.) to number
  const rating = parseInt(ratingValue, 10);
   if (isNaN(rating) || rating < 1 || rating > 5) {
       displayError(feedbackErrorElement, 'Invalid rating selected.');
       return;
   }


  try {
      const response = await fetch(`${API_URL}/feedback`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              userId: currentUser.id,
              rating: rating, // Send the numerical rating
              comment: comment
          })
      });

       // Check response status before parsing JSON
       if (!response.ok) {
           let errorData;
           try {
               errorData = await response.json();
           } catch (e) {
               errorData = { error: `HTTP error! status: ${response.status}` };
           }
           throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
       }

      const data = await response.json(); // Assuming backend sends JSON on success

      if (data.success) {
          closeFeedback();
          showToast('Thank you for your feedback!');
      } else {
          // This case might not be reached if API throws error on failure
           displayError(feedbackErrorElement, data.error || 'Failed to submit feedback. Please try again.');
      }
  } catch (error) {
      console.error('Feedback submission error:', error);
      displayError(feedbackErrorElement, `Error: ${error.message}. Please try again later.`);
  }
}