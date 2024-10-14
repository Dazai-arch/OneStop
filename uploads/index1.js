async function validateForm(event) {
  event.preventDefault();

  // Your existing validation logic here...

  // After validation, send the login request
  const email = document.forms["mform"]["e"].value;
  const password = document.forms["mform"]["password"].value;

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      // Redirect to the home page if login is successful
      window.location.href = "/home.html"; // Adjust the path as needed
    } else {
      const errorMessage = await response.json();
      if (response.status === 404) {
        // Display the error message sent from the server
        window.alert(errorMessage.error);
      } else {
        window.alert("An error occurred. Please try again later.");
      }
    }
  } catch (error) {
    console.log("Error:", error);
  }

  return true; // Return true if all validations pass
}
