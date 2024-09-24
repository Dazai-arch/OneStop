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
    body: JSON.stringify({ imagePath: selectedImagePath }), // Send selected image path to the server
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
        window.location.href = "/html/login.html"; // Redirect to login page after saving
      } else {
        alert("Error saving profile image!");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Something went wrong. Please try again.");
    });
});
