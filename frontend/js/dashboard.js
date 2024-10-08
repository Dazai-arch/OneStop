let tasks = [];

async function fetchTimeSpent() {
    try {
        const response = await fetch('/api/time-spent');
        if (!response.ok) {
            throw new Error("Failed to fetch time spent");
        }
        
        const data = await response.json();
        
        // Format total time to two decimal places
        const formattedTime = data.totalTime.toFixed(2); // This will convert the totalTime to a string with 2 decimal places
        
        document.querySelector('.time-spent').textContent = `${formattedTime} min`;
    } catch (error) {
        console.error("Error fetching time spent:", error);
        document.querySelector('.time-spent').textContent = 'Error fetching time'; // Display error message to user
    }
}
  async function fetchTotalBudget() {
    try {
        const response = await fetch('/api/total-budget');
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        // Log the total budgets for debugging
        //  console.log("Total Budgets Response:", data.totalBudgets);

        // Clear previous results (if needed)
        document.querySelector('.total-budget').innerHTML = '';

        // Display the total budgets
        for (const [currency, total] of Object.entries(data.totalBudgets)) {
            const displayText = `${currency}: ${total.toFixed(2)}`;
            const div = document.createElement('div');
            div.textContent = displayText; // Append each total budget
            document.querySelector('.total-budget').appendChild(div);
        }
    } catch (error) {
        console.error("Error fetching total budget:", error);
        document.querySelector('.total-budget').textContent = 'Error fetching budget'; // Display error message to the user
    }
}



  async function fetchProjectCount() {
    const response = await fetch('/api/user-projects-count');
    const data = await response.json();
    document.querySelector('.project-count').textContent = data.projectc;
  }
  async function fetchResourceCount() {
    const response = await fetch('/api/resources-count');
    
    if (!response.ok) {
        const error = await response.json();
        console.error("Error fetching resource count:", error.message);
        return;
    }

    const data = await response.json();
    document.getElementById("resource-count").textContent = data.resourceCount; // Update the DOM with resource count
}

const statusMappings = {
    'New': 'new',               
    'Planned': 'planned',       
    'In Progress': 'in-progress', 
    'Completed': 'completed'     
};


// Function to fetch tasks from the API for a particular project
async function fetchTasks() {
    const response = await fetch('/api/tasks');
    if (!response.ok) {
        const error = await response.json();
        console.error("Error fetching tasks:", error.message);
        return;
    }

    tasks = await response.json(); // Store fetched tasks in the global variable
    renderTasks(tasks);
    calculateProgress(tasks); // Render tasks on the initial load
    generateTable(tasks);
}
const allowedStatuses = ['In Progress', 'Planned'];
// Render tasks based on the provided tasks array
function renderTasks(tasksToRender) {
    const taskContainer = document.getElementById('tasks');
    taskContainer.innerHTML = ''; // Clear existing tasks

    tasksToRender.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.classList.add('task-item');
        const statusClass = statusMappings[task.status] || task.status; // Get the appropriate class for status
        taskDiv.innerHTML = `
            <span class="task-name">${task.title}</span>
            <span class="task-status ${statusClass}">${task.status}</span>
        `;
        taskContainer.appendChild(taskDiv);
    });

    // Update counts after rendering
    updateTaskCounts();
}

// Function to update task counts
function updateTaskCounts() {
    const totalTasksCount = tasks.length;
    const importantTasksCount = tasks.filter(task =>  allowedStatuses.includes(task.status)).length;
    const newTasksCount = tasks.filter(task => task.status === 'New').length; // Assuming you have a status called 'New'
    const oldTasksCount = tasks.filter(task => task.status === 'Completed').length; // Assuming completed tasks

    document.querySelector('.tab[data-tab="all"] .count').textContent = totalTasksCount;
    document.querySelector('.tab[data-tab="important"] .count').textContent = importantTasksCount;
    document.querySelector('.tab[data-tab="new"] .count').textContent = newTasksCount;
    document.querySelector('.tab[data-tab="old"] .count').textContent = oldTasksCount;
}

// Function to fetch and render filtered tasks based on the selected tab
function fetchFilteredTasks(tab) {
    let filteredTasks;
    if (tab === 'important') {
        filteredTasks = tasks.filter(task => allowedStatuses.includes(task.status));
    } else if (tab === 'new') {
        filteredTasks = tasks.filter(task => task.status == 'New');
    } else if (tab === 'old') {
        filteredTasks = tasks.filter(task => task.status === 'Completed');
    } else {
        filteredTasks = tasks; // Default to all tasks
    }

    renderTasks(filteredTasks);
}

// Handle tab click events
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
        const selectedTab = this.getAttribute('data-tab');

        // Remove active class from all tabs and add to the clicked tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        // Fetch and render tasks based on the selected tab
        fetchFilteredTasks(selectedTab);
    });
});

function calculateProgress(tasks) {
    // console.log("Fetched Tasks:", tasks); // Log the tasks for debugging

    const totalTasks = tasks.length;
    // console.log(`Total Tasks: ${totalTasks}`); // Log total tasks

    // Log each task's status to verify correctness
    // tasks.forEach(task => {
    //     //console.log(`Task Title: ${task.title}, Status: ${task.status}`);
    // });

    const completedTasks = tasks.filter(task => task.status === 'Completed').length;
    const delayedTasks = tasks.filter(task => task.status === 'New').length; // Assuming 'New' means delayed in your context
    const ongoingTasks = tasks.filter(task => task.status === 'In Progress').length; // Adjust if needed

    // Calculate the percentage of completed tasks
    const completedPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const delayedPercentage = totalTasks > 0 ? (delayedTasks / totalTasks) * 100 : 0;
    const ongoingPercentage = totalTasks > 0 ? (ongoingTasks / totalTasks) * 100 : 0;

    // Update the DOM elements
    document.getElementById('total-projects').textContent = totalTasks;
    document.getElementById('completed-projects').textContent = completedTasks;
    document.getElementById('delayed-projects').textContent = delayedTasks;
    document.getElementById('ongoing-projects').textContent = ongoingTasks;
    document.getElementById('gauge-percentage').textContent = `${completedPercentage.toFixed(2)}%`;

    // Set the gauge bar rotation based on the completed percentage
    const gaugeBar = document.querySelector('.gauge-bar');
    const rotationDegree = (completedPercentage / 100) * 180; // Assuming the gauge is half-circle
    gaugeBar.style.transform = `rotate(${rotationDegree}deg)`;

    // Optionally log the calculated percentages
    // console.log(`Completed Percentage: ${completedPercentage.toFixed(2)}%`);
    // console.log(`Delayed Percentage: ${delayedPercentage.toFixed(2)}%`);
    // console.log(`Ongoing Percentage: ${ongoingPercentage.toFixed(2)}%`);
    switch (tasks.status) {
        case 'Completed':
            return 100;
        case 'In Progress':
            return 50;
        case 'Planned':
            return 25;
        case 'New':
            return 0;
        default:
            return 0; // 0% progress for "New" or unknown status
    }
}
function calculateTaskProgress(task) {
    switch (task.status) {
        case 'Completed':
            return 100;
        case 'In Progress':
            return 68;
        case 'Planned':
            return 50;
        case 'New':
            return 35;
        default:
            return 0; // 0% progress for "New" or unknown status
    }

}

async function fetchProjects() {
    try {
        const response = await fetch('/api/taskprojects');
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const tasks = await response.json(); // Fetch tasks
        // console.log("Fetched Tasks:", tasks); // Log fetched tasks for debugging

        // Check if tasks is an array and has elements
        if (!Array.isArray(tasks)) {
            console.error("Error: tasks is not an array. Actual data:", tasks);
            return; // Exit if tasks is not an array
        }

        if (tasks.length === 0) {
            console.warn("No tasks found for the project.");
            return; // Exit if no tasks found
        }

        // Call the generateTable function if all checks pass
        generateTable(tasks); // Pass the fetched tasks to the generateTable function
    } catch (error) {
        console.error("Error fetching tasks:", error);
    }
}


function generateTable(tasks) {
    const tableBody = document.getElementById('project-body');
    const today = new Date(); 
    if (!tableBody) {
        console.error("Error: 'project-body' not found in the DOM.");
        return;
    }

    // console.log("Table body found:", tableBody); // Log to ensure it's being selected

    // Clear previous entries in the table
    tableBody.innerHTML = '';

    // Log the structure of tasks
    // console.log("Generating table with tasks:", tasks);

    // Ensure tasks is an array
    if (!Array.isArray(tasks) || tasks.length === 0) {
        console.warn("No tasks available to display.");
        return;
    }

    // Use for...of to iterate through tasks
    tasks.forEach((task, index) => {
        // console.log("Processing Task:", task); // Log each task being processed

        // Create a new row for each task
        const row = document.createElement('tr');
        // console.log(`Row created for task ${index}: ${task.title}`);

        const nameCell = document.createElement('td');
        nameCell.textContent = task.title || 'N/A'; // Task title
        row.appendChild(nameCell);
        // console.log("Appended name cell.");

        const managerCell = document.createElement('td');
        managerCell.textContent = task.assignee || 'N/A';
        row.appendChild(managerCell);
        // console.log("Appended manager cell.");

        const dueDateCell = document.createElement('td');
        const formattedDate = formatDate(task.dueDate); // Call formatDate function
        dueDateCell.textContent = formattedDate;

        // Check if the due date is before today and style accordingly
        if (task.dueDate && new Date(task.dueDate) < today) {
            dueDateCell.style.color = 'red'; // Change text color to red if past due date
        }
        row.appendChild(dueDateCell);

        const statusCell = document.createElement('td');
        statusCell.textContent = task.status || 'N/A';
        statusCell.className = `status-${task.status ? task.status.replace(' ', '').toLowerCase() : 'unknown'}`;
        row.appendChild(statusCell);
        // console.log("Appended status cell.");

        const progressCell = document.createElement('td');
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';

        // Calculate individual task progress
        const progress = calculateTaskProgress(task); // Now using single task progress calculation
        const progressSpan = document.createElement('span');
        progressSpan.className = `progress-${progress}`;
        progressSpan.style.width = `${progress}%`; // Set width dynamically
        calculateProgress(tasks);
        progressBar.appendChild(progressSpan);
        progressCell.appendChild(progressBar);
        row.appendChild(progressCell);

        // Append the row to the table body
        tableBody.appendChild(row);
        // console.log("Row appended successfully for task:", task.title); // Log successful append
    });

    // Log the final table body content for debugging
    // console.log("Table Body after appending rows:", tableBody.innerHTML);
}


function formatDate(date) {
    if (!date) return 'N/A'; // Return 'N/A' if no date is provided
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}


async function fetchFilters() {
    try {
        // Fetch managers (assignees) - project ID is used from session on the server-side
        await fetchManagers();

        // Fetch statuses
        const statusResponse = await fetch('/api/statuses');
        const statuses = await statusResponse.json();
        populateStatusFilter(statuses);
    } catch (error) {
        console.error("Error fetching filters:", error);
    }
}

// Fetch managers (assignees) from server using project ID stored in session
async function fetchManagers() {
    try {
        const response = await fetch('/api/managers');
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const managers = await response.json();
        populateManagerFilter(managers);
    } catch (error) {
        console.error("Error fetching managers:", error);
    }
}

// Populate the manager (assignee) filter
function populateManagerFilter(managers) {
    const managerFilter = document.getElementById('manager-filter');
    managerFilter.innerHTML = '<option value="all">Select an Assignee</option>'; // Reset and add default option

    managers.forEach(manager => {
        const option = document.createElement('option');
        option.value = manager; // Use the manager's name as the value
        option.textContent = manager; // Display the manager's name
        managerFilter.appendChild(option);
    });
}

// Populate the status filter
function populateStatusFilter(statuses) {
    const statusFilter = document.getElementById('status-filter');
    statusFilter.innerHTML = '<option value="all">Select Status</option>'; // Reset and add default option

    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status; 
        option.textContent = status; 
        statusFilter.appendChild(option);
    });
}

document.getElementById('manager-filter').addEventListener('change', async function() {
    const selectedAssignee = this.value;
    if (selectedAssignee !== 'all') {
        await fetchTasksByAssignee(selectedAssignee);
    } else {
        // Optionally, you can reset tasks or handle default case here
        fetchTasks();
    }
});

// Fetch tasks by status
document.getElementById('status-filter').addEventListener('change', async function() {
    const selectedStatus = this.value;
    if (selectedStatus !== 'all') {
        await fetchTasksByStatus(selectedStatus);
    } else {
        // Optionally, you can reset tasks or handle default case here
        fetchTasks();
    }
});

async function fetchTasksByAssignee(assigneeId) {
    try {
        const response = await fetch(`/api/tasks/assignee/${assigneeId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch tasks by assignee");
        }
        const tasks = await response.json();
        generateTable(tasks); // Assuming you have a generateTable function to display tasks
    } catch (error) {
        console.error("Error fetching tasks by assignee:", error);
    }
}

async function fetchTasksByStatus(status) {
    try {
        const response = await fetch(`/api/tasks/status/${status}`);
        if (!response.ok) {
            throw new Error("Failed to fetch tasks by status");
        }
        const tasks = await response.json();
        generateTable(tasks); // Assuming you have a generateTable function to display tasks
    } catch (error) {
        console.error("Error fetching tasks by status:", error);
    }
}


  document.addEventListener('DOMContentLoaded', async function () {
    fetchTimeSpent();
    fetchTasks();
    fetchTotalBudget();
    fetchProjectCount();
    fetchResourceCount();
    renderTasks(tasks);
    fetchProjects();
    fetchFilters();
    fetch('/profile')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('username').textContent = data.username;
                    document.getElementById('designation').textContent = data.designation;
                    document.getElementById('profileimage').src = data.image;
                })
                .catch(error => console.error('Error fetching profile data:', error));
            
            // Fetch selected project from session
            fetch('/api/get-selected-project')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        fetchTasks(data.projectId);
                    } else {
                        alert('No project selected.');
                        window.location.href = '/html/project.html';
                    }
                })
                .catch(error => console.error('Error fetching selected project:', error));




                const workloadChart = document.querySelector(".workload-chart");
    
    // Function to create workload circles
    function createWorkloadCircles(workloadData) {
        workloadChart.innerHTML = ""; // Clear previous content

        Object.keys(workloadData).forEach(manager => {
            const workload = workloadData[manager];

            const workloadItem = document.createElement("div");
            workloadItem.classList.add("workload-item");

            // Circle container (for stacked circles)
            const circleContainer = document.createElement("div");
            circleContainer.classList.add("circle-container");

            // Generate the number of circles based on workload
            for (let i = 1; i <= 10; i++) {
                const circle = document.createElement("div");
                circle.classList.add("circle");

                if (i <= workload) {
                    circle.classList.add("inactive");
                }

                if (i === workload) {
                    circle.classList.add("active");
                    circle.textContent = workload; // Show workload number
                }

                circleContainer.appendChild(circle);
            }

            const managerName = document.createElement("p");
            managerName.classList.add("manager-name");
            managerName.textContent = manager;

            workloadItem.appendChild(circleContainer);
            workloadItem.appendChild(managerName);

            workloadChart.appendChild(workloadItem);
        });
    }

    // Function to fetch session info to get the project ID
    async function fetchSessionInfo() {
        try {
            const response = await fetch('/api/session-info');
            if (!response.ok) {
                throw new Error("Failed to fetch session info");
            }
            return await response.json(); // Return the session info containing userId and projectId
        } catch (error) {
            console.error("Error fetching session info:", error);
            return null; // Return null if there's an error
        }
    }

    // Function to fetch workload data for the selected project
    async function fetchWorkloadData(projectId, timeRange) {
        try {
            const response = await fetch(`/api/workload/${projectId}?timeRange=${timeRange}`);
            if (!response.ok) {
                throw new Error("Failed to fetch workload data");
            }
            const workloadData = await response.json();
            createWorkloadCircles(workloadData); // Pass the fetched workload data to the circle creation function
        } catch (error) {
            console.error("Error fetching workload data:", error);
        }
    }

    // Fetch session info and then load workload data
    const sessionInfo = await fetchSessionInfo();
    if (sessionInfo) {
        const projectId = sessionInfo.projectId; // Get the project ID from session info

        // Initial load for "Last 3 months"
        fetchWorkloadData(projectId, "Last 3 months");

        // Handle change in time range
        document.querySelector("#time-range").addEventListener("change", function () {
            const selectedTimeRange = this.value;
            fetchWorkloadData(projectId, selectedTimeRange); // Fetch for the selected project and time range
        });
    }
            
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