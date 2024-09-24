// Initialize BotPress Web Chat widget
window.botpressWebChat.init({
    hostUrl: "https://mediafiles.botpress.cloud", // Your BotPress host URL
    botId: "856da8a2-033f-401d-9cb2-e79db5bf2fd8", // Your Bot ID
    hideWidget: true,
    enableConversationDeletion: false,
    showUserNameInput: true
});

// Function to send a message to the BotPress chatbot
function sendMessageToBotpress(message) {
    window.botpressWebChat.sendEvent({
        type: 'proactive-trigger',
        payload: { text: message }
    });
}

// Event listener for the "Search" button to interact with the chatbot
document.getElementById("searchButton").addEventListener("click", function() {
    const query = document.getElementById("searchBar").value;

    if (query) {
        // Send the search query to the BotPress chatbot
        sendMessageToBotpress(query);
    } else {
        window.alert("Please enter a topic to search.");
    }
});


