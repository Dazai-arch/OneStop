document
  .getElementById("passwordResetForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
      document.getElementById("message").innerText = "Passwords do not match!";
      setTimeout(() => {
        document.getElementById("message").innerText = "";
      }, 2000);
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      document.getElementById("message").innerText =
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&).";
      setTimeout(() => {
        document.getElementById("message").innerText = "";
      }, 2000);
      return;
    }

    try {
      const response = await fetch("/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: localStorage.getItem("email"),
          newPassword,
        }),
      });

      const result = await response.json();
      document.getElementById("message").innerText = result.message;

      if (result.message === "Password reset successfully!") {
        document.getElementById("message").innerText =
          "Password reset successful!";
        setTimeout(() => {
          window.location.href = "../html/login.html";
        }, 2000);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      document.getElementById("message").innerText =
        "Error resetting password.";
      setTimeout(() => {
        document.getElementById("message").innerText = "";
      }, 2000);
    }
  });
