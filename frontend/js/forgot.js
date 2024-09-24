document.getElementById('resetForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;

    try {
        const response = await fetch('http://localhost:3000/send-reset-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const result = await response.json();
        document.getElementById('message').innerText = result.message;

        if (response.ok) {
            localStorage.setItem('email', email);
            setTimeout(() => {
                window.location.href = '../html/verify.html'; 
            }, 1000);
        }
    } catch (error) {
        console.error('Error sending reset code:', error);
        document.getElementById('message').innerText = 'Error sending reset code.';
    }
});
