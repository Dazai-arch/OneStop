document.addEventListener('DOMContentLoaded', function () {
    // Fetch profile data when the page loads
    fetch('/profile')
        .then(response => response.json())
        .then(data => {
            // Populate the profile fields
            document.getElementById('username').value = data.username;
            document.getElementById('designation').value = data.designation;
            document.getElementById('email').value = data.email;
            document.getElementById('date').value = new Date(data.date).toLocaleDateString();
            
            // Set the profile image source
            const profileImage = document.getElementById('profileimage');
            profileImage.src = data.image;
            profileImage.alt = data.username + "'s profile image";
        })
        .catch(error => {
            console.error('Error fetching profile data:', error);
        });
});

document.getElementById("logout-btn").addEventListener("click", function () {
    fetch('/logout', {
        method: 'POST', // Send a POST request for logout
        credentials: 'include', // Include cookies (session info)
    })
    .then((response) => {
        if (response.ok) {
            // Redirect to the home page on successful logout
            window.location.href = '/html/home.html';
        } else {
            alert("Failed to log out. Please try again.");
        }
    })
    .catch((error) => {
        console.error('Error logging out:', error);
    });
});