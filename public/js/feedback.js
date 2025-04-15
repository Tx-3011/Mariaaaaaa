// Simplified feedback.js - Core functionality only
function showFeedbackModal() {
    if (!currentUser) {
      alert('Please login to leave feedback');
      return;
    }
    
    const feedbackModal = document.getElementById('feedbackModal');
    if (feedbackModal) {
      document.getElementById('rating').value = '';
      document.getElementById('feedbackText').value = '';
      feedbackModal.style.display = 'block';
    }
  }
  
  function closeFeedback() {
    const feedbackModal = document.getElementById('feedbackModal');
    if (feedbackModal) feedbackModal.style.display = 'none';
  }
  
  async function submitFeedback() {
    if (!currentUser) {
      alert('Error: You are not logged in');
      return;
    }
  
    const rating = document.getElementById('rating').value;
    const comment = document.getElementById('feedbackText').value.trim();
  
    if (!rating) {
      alert('Please select a rating');
      return;
    }
  
    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          rating: parseInt(rating, 10),
          comment: comment
        })
      });
  
      const data = await response.json();
      
      if (data.success) {
        closeFeedback();
        alert('Thank you for your feedback!');
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      alert('Error submitting feedback. Please try again later.');
    }
  }