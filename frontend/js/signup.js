async function validateForm(event) {
    event.preventDefault();

    // Email validation
    let email = document.getElementById("email").value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email === "") {
        window.alert("Please enter the email address");
        return false;
    } else if (!emailRegex.test(email)) {
       window.alert("Please enter a valid email");
        return false;
    } else {
        document.getElementById("err1").innerHTML = "";
    }

    // Username validation
    let username = document.getElementById("username").value;
    if (username === "") {
        window.alert("Please enter your username");
        return false;
    } else {
        document.getElementById("err2").innerHTML = "";
    }

    // Designation validation
    let designation = document.getElementById("designation").value;
    if (designation === "") {
        window.alert("Please enter your designation");
        return false;
    } else {
        document.getElementById("err3").innerHTML = "";
    }

    // Phone number validation
    let phone = document.getElementById("phoneno").value;
    if (phone === "") {
        window.alert("Please enter your phone number");
        return false;
    } else {
        document.getElementById("err4").innerHTML = "";
    }

    // Password validation
    let password = document.getElementById("password").value;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
        window.alert("Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&).");
        return false;
    } else {
        document.getElementById("err5").innerHTML = "";
    }


    sendDataToServer({ email, username, designation, phone, password });
}

async function sendDataToServer(userData) {
    try {
        const response = await fetch('http://localhost:3000/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        //document.getElementById("message").innerText = result.message;
        console.log("Response from server:", result);
        if (response.ok) {
            window.location.href = '../html/profileimage.html';
        }
        else {
            window.alert(result.message || "Email already in use.");
        }
    } catch (error) {
        window.alert("Error during signup. Please try again.");
        console.error('Error:', error);
    }
}


