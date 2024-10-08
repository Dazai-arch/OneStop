document.addEventListener("DOMContentLoaded", () => {});

let selectedImagePath = "";

// Add event listeners to the images in the `.section` div
document.querySelectorAll(".section img").forEach((img) => {
  img.addEventListener("click", function () {
    // Remove the 'selected' class from all images
    document
      .querySelectorAll(".section img")
      .forEach((i) => i.classList.remove("selected"));
    // Add the 'selected' class to the clicked image
    this.classList.add("selected");
    // Store the image path
    selectedImagePath = this.src; // Store the selected image's URL
  });
});

// Handle the submit button click
// Handle the submit button click
document.getElementById("submit").addEventListener("click", function () {
  if (selectedImagePath === "") {
    alert("Please select an image!");
    return;
  }

  // Send the selected image path to the server
  fetch("/save-profile-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imagePath: selectedImagePath }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.message === "Profile image saved!") {
        alert("Profile image saved successfully!");

        // Call the send-verification-code endpoint
        return fetch("/send-verification-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } else {
        alert("Error saving profile image!");
      }
    })
    .then((response) => {
      if (response && response.ok) {
        alert("Verification code sent to your email!");
        window.location.href = "/html/emailverify.html"; // Redirect to email verification page
      } else {
        alert("Error sending verification code!");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Something went wrong. Please try again.");
    });
});
