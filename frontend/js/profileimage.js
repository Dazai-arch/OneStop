document.addEventListener("DOMContentLoaded", async () => {
  await checkSession(); // Call the function to check session validity
});

async function checkSession() {
  try {
    const response = await fetch("http://localhost:3000/check-session", {
      method: "GET",
      credentials: "include",
    });

    const result = await response.json();
    if (response.ok) {
      console.log("User is logged in:", result);
      // Proceed with your logic
    } else {
      console.log("User is not logged in.");
      // Redirect to login or show an error
    }
  } catch (error) {
    console.error("Error checking session:", error);
  }
}

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
  fetch("http://localhost:3000/save-profile-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ imagePath: selectedImagePath }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.message === "Profile image saved successfully!") {
        alert("Profile image saved successfully!");
        window.location.href = "./login.html"; // Redirect to login page after saving
      } else {
        alert("Error saving profile image!");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Something went wrong. Please try again.");
    });
});
