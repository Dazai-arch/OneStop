// Global variable to store the reference to the project list
let projects = [];

// Function to open the popup
function openPopup() {
    document.getElementById("projectPopup").style.display = "block";
}

// Function to close the popup
function closePopup() {
    document.getElementById("projectPopup").style.display = "none";
}

// Function to add a project
async function addProject() {
    const projectName = document.getElementById('newProjectName').value.trim();

    if (!projectName) {
        alert("Please enter a project name.");
        return;
    }

    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectName })
        });

        if (response.ok) {
            const projectData = await response.json();
            projects.push(projectData.project); // Add new project to the local projects array
            renderProjects(projects); // Update the project list immediately
            closePopup(); // Close the popup after the project is added
            document.getElementById('newProjectName').value = ''; // Clear the input field
        } else {
            const errorData = await response.json();
            alert(errorData.message);
        }
    } catch (error) {
        console.error('Error adding project:', error);
    }
}

// Function to fetch and render user projects
async function fetchUserProjects() {
    try {
        const response = await fetch('/api/project');
        if (response.ok) {
            projects = await response.json(); // Update global projects array with fetched projects
            renderProjects(projects); // Render the fetched projects
        } else {
            throw new Error('Failed to fetch projects');
        }
    } catch (error) {
        console.error('Error fetching projects:', error);
        alert('Error fetching projects.');
    }
}

// Function to render the list of projects
function renderProjects(projects) {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = ''; // Clear current list

    projects.forEach((project) => {
        const projectItem = document.createElement('li');
        projectItem.className = 'project-item';

        // Add project name as a clickable link and a delete button
        projectItem.innerHTML = `
            <a class="project-link" href="javascript:void(0)" onclick="selectProject('${project._id}')">${project.name}</a>
            <button onclick="deleteProject('${project._id}')">✕</button>
        `;

        projectList.appendChild(projectItem);
    });
}

// Event listener to fetch user projects on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchUserProjects(); // Fetch projects when the page loads
});

// Add other necessary functions such as selectProject and deleteProject...
