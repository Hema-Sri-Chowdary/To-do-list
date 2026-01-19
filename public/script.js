// ===== API Configuration =====
// If hostname is localhost or 127.0.0.1, we might be in dev mode.
// If hostname is empty (file://) or localhost/127.0.0.1 AND port is NOT 5000, use full URL.
const isDevExternal =
    window.location.protocol === 'file:' ||
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000');
const API_BASE_URL = isDevExternal ? 'http://localhost:5000/api' : '/api';

// ===== Global State =====
let currentUser = null;
let authToken = null;
let tasks = [];
let selectedTaskForUpdate = null;

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', function () {
    loadAuthFromStorage();
    initializeApp();
});

async function initializeApp() {
    // Check if user is logged in via regular auth
    loadAuthFromStorage();

    if (authToken && currentUser) {
        try {
            // Fetch tasks from backend
            await fetchTasks();
            showScreen('dashboard-screen');
            updateUserInfo();
            renderDashboard();
        } catch (error) {
            console.error('Init error:', error);
            // Token might be expired, logout
            handleLogout();
        }
    } else {
        showScreen('login-screen');
    }

    // Setup form handlers
    setupFormHandlers();

    // Setup notifications
    setupNotificationHandler();

    // Setup password toggle
    setupPasswordToggle();
}

// ===== API Helper Functions =====
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add auth token if available
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.message || 'Request failed');
            if (data.errors) error.errors = data.errors;
            throw error;
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===== Screen Management =====
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show requested screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');

        // Update screen-specific content
        updateScreenContent(screenId);
    }

    // Close sidebar if open
    closeSidebar();
}

async function updateScreenContent(screenId) {
    switch (screenId) {
        case 'dashboard-screen':
            await renderDashboard();
            break;
        case 'all-tasks-screen':
            await renderAllTasks();
            break;
        case 'completed-tasks-screen':
            await renderCompletedTasks();
            break;
        case 'pending-tasks-screen':
            await renderPendingTasks();
            break;
        case 'add-tasks-screen':
            renderAddTasksPreview();
            break;
        case 'update-tasks-screen':
            renderUpdateTasksSelection();
            break;
        case 'delete-tasks-screen':
            renderDeleteTasks();
            break;
    }
}

// ===== Form Handlers =====
function setupFormHandlers() {
    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Signup Form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Signup OTP Form
    const signupOtpForm = document.getElementById('signup-otp-form');
    if (signupOtpForm) {
        signupOtpForm.addEventListener('submit', handleSignupOTP);
    }

    // Forgot Password Form
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }

    // Add Task Form
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', handleAddTask);
    }

    // OTP Input Auto-focus
    setupOTPInputs();
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        // Save auth data
        authToken = response.data.token;
        currentUser = response.data.user;
        saveAuthToStorage();

        // Fetch tasks
        await fetchTasks();

        // Navigate to dashboard
        showScreen('dashboard-screen');
        updateUserInfo();
        renderDashboard();

    } catch (error) {
        // Handle unverified email case
        if (error.message.includes('Email not verified') || (error.data && error.data.needsVerification)) {
            const email = document.getElementById('login-email').value;
            document.getElementById('signup-otp-email').value = email;

            // Show OTP screen
            showScreen('signup-otp-screen');
            showModal('Verification Required', 'Please verify your email to login.');
            setupSignupOTPInputs();
            return;
        }
        showModal('Login Failed', error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await apiRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        // Store email for OTP verification
        document.getElementById('signup-otp-email').value = email;

        // Show OTP screen
        showScreen('signup-otp-screen');
        showModal('Success', 'Verification code sent to your email!');

        // Setup OTP inputs
        setupSignupOTPInputs();

    } catch (error) {
        let message = error.message;
        // logic to show specific validation error if available
        if (error.errors && error.errors.length > 0) {
            message = error.errors[0].message;
        }
        showModal('Signup Failed', message);
    }
}

async function handleSignupOTP(e) {
    e.preventDefault();

    const email = document.getElementById('signup-otp-email').value;
    const otpInputs = document.querySelectorAll('.signup-otp-input');
    const otp = Array.from(otpInputs).map(input => input.value).join('');

    if (otp.length !== 4) {
        showModal('Invalid Code', 'Please enter the 4-digit code');
        return;
    }

    try {
        const response = await apiRequest('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });

        // Save auth data
        authToken = response.data.token;
        currentUser = response.data.user;
        saveAuthToStorage();

        // Initialize empty tasks
        tasks = [];

        // Navigate to dashboard
        showScreen('dashboard-screen');
        updateUserInfo();
        renderDashboard();

    } catch (error) {
        showModal('Verification Failed', 'Verification failed: ' + error.message);
    }
}

function setupSignupOTPInputs() {
    const inputs = document.querySelectorAll('.signup-otp-input');
    inputs.forEach((input, index) => {
        input.addEventListener('input', function () {
            if (this.value.length === 1) {
                if (index < inputs.length - 1) inputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && this.value.length === 0) {
                if (index > 0) inputs[index - 1].focus();
            }
        });
    });
}

async function handleForgotPassword(e) {
    e.preventDefault();

    const otpSection = document.getElementById('otp-section');
    if (otpSection && otpSection.style.display !== 'none') {
        return;
    }

    const email = document.getElementById('forgot-email').value;

    try {
        await apiRequest('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        // Show OTP section
        const otpSection = document.getElementById('otp-section');
        if (otpSection) {
            otpSection.style.display = 'block';
        }

        // Store email for later use
        sessionStorage.setItem('resetEmail', email);

        showModal('Success', 'OTP sent to your email! Please check your inbox.');

        // Setup OTP verification
        setupOTPVerification(email);

    } catch (error) {
        showModal('Error', error.message);
    }
}

function setupOTPVerification(email) {
    const otpInputs = document.querySelectorAll('.otp-input');

    const triggerVerification = () => {
        const otp = Array.from(otpInputs).map(input => input.value).join('');

        if (otp.length === 4) {
            let passwordInput = document.getElementById('new-password-input');
            if (!passwordInput) {
                const otpSection = document.getElementById('otp-section');
                const passDiv = document.createElement('div');
                passDiv.className = 'input-wrapper';
                passDiv.style.marginTop = '20px';
                passDiv.innerHTML = '<input type="password" id="new-password-input" placeholder="Enter new password" required style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px;">';
                otpSection.appendChild(passDiv);

                const submitBtn = document.createElement('button');
                submitBtn.type = 'button'; // Prevent form submit
                submitBtn.className = 'btn-primary';
                submitBtn.style.marginTop = '10px';
                submitBtn.textContent = 'Reset Password';
                submitBtn.onclick = async () => {
                    const newPassword = document.getElementById('new-password-input').value;
                    if (newPassword && newPassword.length >= 6) {
                        try {
                            await apiRequest('/auth/reset-password', {
                                method: 'POST',
                                body: JSON.stringify({ email, otp, newPassword })
                            });
                            showModal('Success', 'Password reset successful! Please login.', () => {
                                sessionStorage.removeItem('resetEmail');
                                showScreen('login-screen');
                            });
                        } catch (error) {
                            showModal('Error', 'Password reset failed: ' + error.message);
                        }
                    } else {
                        showModal('Invalid Password', 'Password must be at least 6 characters');
                    }
                };
                otpSection.appendChild(submitBtn);

                // Hide original "Send OTP" button if visible (it submitted the form)
                const sendOtpBtn = document.querySelector('#forgot-password-form button[type="submit"]');
                if (sendOtpBtn) sendOtpBtn.style.display = 'none';

                document.getElementById('new-password-input').focus();
            }
        }
    };

    // When all OTP digits are entered
    otpInputs[3].addEventListener('input', function () {
        if (this.value.length === 1) {
            triggerVerification();
        }
    });

    // Handle Enter key on any OTP input
    otpInputs.forEach(input => {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const otp = Array.from(otpInputs).map(i => i.value).join('');
                if (otp.length === 4) {
                    triggerVerification();
                }
            }
        });
    });
}

async function handleAddTask(e) {
    e.preventDefault();

    const taskName = document.getElementById('task-name').value;
    const taskTime = document.getElementById('task-time').value;
    const taskDate = document.getElementById('task-date').value;

    // Validate Deadline (Must not be in the past)
    if (taskDate && taskTime) {
        const selectedDateTime = new Date(`${taskDate} ${taskTime}`);
        const currentDateTime = new Date();

        if (selectedDateTime < currentDateTime) {
            showModal('Invalid Deadline', 'The deadline time is before current time');
            return;
        }
    }

    try {
        const response = await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify({
                name: taskName,
                time: taskTime,
                date: taskDate,
                icon: getRandomIcon(),
                color: getRandomColor()
            })
        });

        // Add to local tasks array
        tasks.push(response.data);

        // Clear form
        document.getElementById('add-task-form').reset();

        // Redirect to All Tasks page
        showScreen('all-tasks-screen');

    } catch (error) {
        showModal('Error', 'Error creating task: ' + error.message);
    }
}

function handleLogout() {
    showScreen('logout-screen');

    // Clear auth data after 2 seconds
    setTimeout(() => {
        authToken = null;
        currentUser = null;
        tasks = [];
        clearAuthFromStorage();
        showScreen('login-screen');
    }, 2000);
}

// ===== Task API Functions =====
async function fetchTasks() {
    try {
        const response = await apiRequest('/tasks');
        tasks = response.data;
        return tasks;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
    }
}

async function updateTask(taskId, updates) {
    try {
        const response = await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        // Update local tasks array
        const index = tasks.findIndex(t => t._id === taskId);
        if (index !== -1) {
            tasks[index] = response.data;
        }

        return response.data;
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
}

async function deleteTask(taskId) {
    try {
        await apiRequest(`/tasks/${taskId}`, {
            method: 'DELETE'
        });

        // Remove from local tasks array
        tasks = tasks.filter(t => t._id !== taskId);
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
}

async function bulkDeleteTasks(taskIds) {
    try {
        await apiRequest('/tasks/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ taskIds })
        });

        // Remove from local tasks array
        tasks = tasks.filter(t => !taskIds.includes(t._id));
    } catch (error) {
        console.error('Error deleting tasks:', error);
        throw error;
    }
}

// ===== Sidebar Management =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// ===== User Info Management =====
function updateUserInfo() {
    if (!currentUser) return;

    const initials = currentUser.name.substring(0, 2).toUpperCase();
    const name = currentUser.name;

    // Update all profile pics
    const profilePics = document.querySelectorAll('.profile-pic span');
    profilePics.forEach(pic => {
        pic.textContent = initials;
    });

    // Update username
    const usernameElement = document.getElementById('dashboard-username');
    if (usernameElement) {
        usernameElement.textContent = name;
    }
}

// ===== Dashboard Rendering =====
async function renderDashboard() {
    updateUserInfo();
    await fetchTasks(); // Refresh tasks
    renderInProgressTasks();
    updateCompletionPercentage();
    updateSummaryBlocks();
}

function renderInProgressTasks() {
    const container = document.getElementById('in-progress-tasks');
    if (!container) return;

    const inProgressTasks = tasks.filter(task => !task.completed);

    container.innerHTML = '';

    if (inProgressTasks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); font-size: 14px;">No pending tasks</p>';
        return;
    }

    inProgressTasks.forEach(task => {
        const taskCard = createTaskCard(task);
        container.appendChild(taskCard);
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';

    card.innerHTML = `
        <div class="task-card-header">
            <div class="task-card-icon ${task.color}">
                ${task.icon}
            </div>
            <div class="task-progress-text">${task.progress}%</div>
        </div>
        <h4 class="task-card-title">${task.name}</h4>
        <p class="task-card-deadline">Deadline: ${formatDeadline(task.deadline)}</p>
        <div class="task-progress-bar">
            <div class="task-progress-fill" style="width: ${task.progress}%"></div>
        </div>
    `;

    return card;
}

function updateCompletionPercentage() {
    // If no tasks, show 100% (nothing to do = 100% complete)
    if (tasks.length === 0) {
        const percentageElement = document.getElementById('completion-percentage');
        if (percentageElement) {
            percentageElement.textContent = '100%';
        }
        const progressCircle = document.getElementById('progress-circle');
        if (progressCircle) {
            const circumference = 2 * Math.PI * 42;
            progressCircle.style.strokeDashoffset = 0; // Full circle
        }
        return;
    }

    const totalProgress = tasks.reduce((sum, task) => {
        // Use task.progress directly. Completed tasks should be 100 already, 
        // but if there's any sync issue, you could force 100 for completed ones.
        // Given previous step updates progress to 100 on completion, task.progress is safe.
        return sum + (task.progress || 0);
    }, 0);

    const percentage = Math.round(totalProgress / tasks.length);

    // Update percentage text
    const percentageElement = document.getElementById('completion-percentage');
    if (percentageElement) {
        percentageElement.textContent = `${percentage}%`;
    }

    // Update circular progress
    const progressCircle = document.getElementById('progress-circle');
    if (progressCircle) {
        const circumference = 2 * Math.PI * 42; // r = 42
        const offset = circumference - (percentage / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }
}

function updateSummaryBlocks() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const inProgressTasks = tasks.filter(task => !task.completed).length;

    const inProgressElement = document.getElementById('tasks-in-progress');
    if (inProgressElement) {
        inProgressElement.textContent = `${inProgressTasks}/${totalTasks}`;
    }

    const completedElement = document.getElementById('tasks-completed');
    if (completedElement) {
        completedElement.textContent = `${completedTasks}/${totalTasks}`;
    }
}

// ===== All Tasks Rendering =====
// ===== All Tasks Rendering =====
async function renderAllTasks() {
    await fetchTasks();

    // Sort tasks by confirmed date and time
    const sortedTasks = [...tasks].sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA - dateB;
    });

    renderTasksList('all-tasks-list', sortedTasks);
}

async function renderCompletedTasks(selectedDate = new Date()) {
    await fetchTasks();
    renderDateSelector('completed-tasks-date-selector', (date) => renderCompletedTasks(date), selectedDate);

    const completedTasks = tasks.filter(task => task.completed && isSameDate(task.date, selectedDate));
    renderTasksList('completed-tasks-list', completedTasks);
}

async function renderPendingTasks(selectedDate = new Date()) {
    await fetchTasks();
    renderDateSelector('pending-tasks-date-selector', (date) => renderPendingTasks(date), selectedDate);

    const pendingTasks = tasks.filter(task => !task.completed && isSameDate(task.date, selectedDate));
    renderTasksList('pending-tasks-list', pendingTasks);
}

// Helper to compare dates
function isSameDate(dateString, dateObj) {
    if (!dateString || !dateObj) return false;
    const d1 = new Date(dateString);
    return d1.getFullYear() === dateObj.getFullYear() &&
        d1.getMonth() === dateObj.getMonth() &&
        d1.getDate() === dateObj.getDate();
}

function renderDateSelector(containerId, onDateSelect, selectedDate = new Date()) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // Generate dates starting from today
    const today = new Date();
    for (let i = 0; i < 15; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const dateCard = document.createElement('div');
        dateCard.className = 'date-card';

        // Check if this card represents the selected date
        if (selectedDate &&
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()) {
            dateCard.classList.add('active');
        }

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[date.getDay()];
        const dayNum = date.getDate();

        dateCard.innerHTML = `
            <span class="date-day">${dayName}</span>
            <span class="date-num">${dayNum}</span>
        `;

        dateCard.addEventListener('click', function () {
            // Update active state visually
            container.querySelectorAll('.date-card').forEach(card => card.classList.remove('active'));
            this.classList.add('active');

            // Trigger callback with new date
            if (onDateSelect) {
                onDateSelect(date);
            }
        });

        container.appendChild(dateCard);
    }
}

function renderTasksList(containerId, tasksList) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (tasksList.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 40px;">No tasks found</p>';
        return;
    }

    tasksList.forEach(task => {
        const taskItem = createTaskItem(task);
        container.appendChild(taskItem);
    });
}

function createTaskItem(task) {
    const item = document.createElement('div');
    item.className = 'task-item';

    item.innerHTML = `
        <div class="task-item-icon ${task.color}">
            ${task.icon}
        </div>
        <div class="task-item-content">
            <h4 class="task-item-title">${task.name}</h4>
            <p class="task-item-meta">Deadline: ${formatDeadline(task.deadline)}</p>
        </div>
        <div class="task-item-status">${task.completed ? '100%' : task.progress + '%'}</div>
    `;

    return item;
}

// ===== Add Tasks Screen =====
function renderAddTasksPreview() {
    const container = document.getElementById('existing-tasks-preview');
    if (!container) return;

    container.innerHTML = '';

    // Show first 2 tasks as preview
    const previewTasks = tasks.slice(0, 2);

    previewTasks.forEach(task => {
        const previewCard = document.createElement('div');
        previewCard.className = 'preview-task-card';

        previewCard.innerHTML = `
            <div class="preview-task-info">
                <div class="task-item-icon ${task.color}">
                    ${task.icon}
                </div>
                <div class="preview-task-details">
                    <h4>${task.name}</h4>
                    <p>Deadline: ${formatDeadline(task.deadline)}</p>
                </div>
            </div>
            <div class="preview-task-status">
                <div class="task-item-icon ${task.color}" style="width: 32px; height: 32px; font-size: 16px;">
                    ${task.icon}
                </div>
                <span style="font-size: 14px; font-weight: 600; color: var(--primary-purple);">${task.progress}%</span>
            </div>
        `;

        container.appendChild(previewCard);
    });
}

// ===== Update Tasks =====
// ===== Update Tasks =====
function renderUpdateTasksSelection(selectedDate = new Date()) {
    renderDateSelector('update-tasks-date-selector', (date) => renderUpdateTasksSelection(date), selectedDate);

    const container = document.getElementById('update-tasks-list');
    if (!container) return;

    container.innerHTML = '';

    const filteredTasks = tasks.filter(task => isSameDate(task.date, selectedDate));

    if (filteredTasks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 40px;">No tasks found for this date</p>';
        return;
    }

    filteredTasks.forEach(task => {
        const taskItem = createSelectableTaskItem(task, 'update');
        container.appendChild(taskItem);
    });
}

function createSelectableTaskItem(task, type) {
    const item = document.createElement('div');
    item.className = 'task-item';

    item.innerHTML = `
        <input type="${type === 'delete' ? 'checkbox' : 'radio'}" 
               name="selected-task" 
               value="${task._id}" 
               class="task-checkbox"
               id="${type}-task-${task._id}">
        <div class="task-item-icon ${task.color}">
            ${task.icon}
        </div>
        <div class="task-item-content">
            <h4 class="task-item-title">${task.name}</h4>
            <p class="task-item-meta">Deadline: ${formatDeadline(task.deadline)}</p>
        </div>
        <div class="task-item-status">${task.completed ? '100%' : task.progress + '%'}</div>
    `;

    return item;
}

function proceedToUpdateDetails() {
    const selectedRadio = document.querySelector('input[name="selected-task"]:checked');

    if (!selectedRadio) {
        showModal('Selection Required', 'Please select a task to update');
        return;
    }

    const taskId = selectedRadio.value;
    selectedTaskForUpdate = tasks.find(task => task._id === taskId);

    if (selectedTaskForUpdate) {
        showScreen('updating-tasks-screen');
        renderUpdatingTasksScreen();
    }
}

function renderUpdatingTasksScreen() {
    if (!selectedTaskForUpdate) return;

    // Render preview
    const previewContainer = document.getElementById('updating-tasks-preview');
    if (previewContainer) {
        previewContainer.innerHTML = '';

        const previewCard = document.createElement('div');
        previewCard.className = 'preview-task-card';

        previewCard.innerHTML = `
            <div class="preview-task-info">
                <div class="task-item-icon ${selectedTaskForUpdate.color}">
                    ${selectedTaskForUpdate.icon}
                </div>
                <div class="preview-task-details">
                    <h4>${selectedTaskForUpdate.name}</h4>
                    <p>Deadline: ${formatDeadline(selectedTaskForUpdate.deadline)}</p>
                </div>
            </div>
            <div class="preview-task-status">
                <span style="font-size: 14px; font-weight: 600; color: var(--primary-purple);">${selectedTaskForUpdate.progress}%</span>
            </div>
        `;

        previewContainer.appendChild(previewCard);
    }

    // Render update form
    const formContainer = document.getElementById('update-details-form');
    if (formContainer) {
        formContainer.innerHTML = `
            <div class="update-field">
                <div>
                    <p class="update-field-label">Task Name</p>
                    <p class="update-field-value" id="update-name-value">${selectedTaskForUpdate.name}</p>
                </div>
                <button class="btn-change" onclick="changeTaskName()">Change Name</button>
            </div>
            <div class="update-field">
                <div>
                    <p class="update-field-label">Deadline Time</p>
                    <p class="update-field-value" id="update-time-value">${selectedTaskForUpdate.time}</p>
                </div>
                <button class="btn-change" onclick="changeTaskTime()">Change Time</button>
            </div>
            <div class="update-field">
                <div>
                    <p class="update-field-label">Deadline Date</p>
                    <p class="update-field-value" id="update-date-value">${selectedTaskForUpdate.date}</p>
                </div>
                <button class="btn-change" onclick="changeTaskDate()">Change Date</button>
            </div>
            <div class="update-field">
                <div>
                    <p class="update-field-label">Percentage</p>
                    <p class="update-field-value" id="update-progress-value">${selectedTaskForUpdate.progress}%</p>
                </div>
                <button class="btn-change" onclick="changeTaskProgress()">Change Percentage</button>
            </div>
        `;
    }
}

function changeTaskName() {
    showInputModal('Change Name', 'Enter new task name:', selectedTaskForUpdate.name, 'text', (newName) => {
        if (newName && newName.trim()) {
            selectedTaskForUpdate.name = newName.trim();
            document.getElementById('update-name-value').textContent = newName.trim();
        }
    });
}

function changeTaskTime() {
    showInputModal('Change Time', 'Enter new time:', selectedTaskForUpdate.time, 'time', (newTime) => {
        if (newTime && newTime.trim()) {
            selectedTaskForUpdate.time = newTime.trim();
            document.getElementById('update-time-value').textContent = newTime.trim();
        }
    });
}

function changeTaskProgress() {
    showInputModal('Change Percentage', 'Enter new percentage (0-100):', selectedTaskForUpdate.progress, 'text', (newProgress) => {
        if (newProgress !== null && newProgress.trim() !== '') {
            // Remove % sign if user typed it
            const cleanProgress = newProgress.replace('%', '').trim();
            const progress = parseInt(cleanProgress);

            if (!isNaN(progress) && progress >= 0 && progress <= 100) {
                selectedTaskForUpdate.progress = progress;
                document.getElementById('update-progress-value').textContent = `${progress}%`;

                // Also update the preview
                const previewStatus = document.querySelector('#updating-tasks-preview .preview-task-status span');
                if (previewStatus) {
                    previewStatus.textContent = `${progress}%`;
                }
            } else {
                showModal('Invalid Input', 'Please enter a number between 0 and 100');
            }
        }
    });
}


function changeTaskDate() {
    showInputModal('Change Date', 'Enter new date (YYYY-MM-DD):', selectedTaskForUpdate.date, 'date', (newDate) => {
        if (newDate && newDate.trim()) {
            selectedTaskForUpdate.date = newDate.trim();
            // Assuming deadline also needs update if it's a derived string, but here we just update date property
            // If deadline is composed, we might need to update it too:
            selectedTaskForUpdate.deadline = `${newDate.trim()} ${selectedTaskForUpdate.time}`;
            document.getElementById('update-date-value').textContent = newDate.trim();
        }
    });
}

async function saveUpdatedTask() {
    if (!selectedTaskForUpdate) return;

    try {
        // Auto-update completed status based on progress
        const isCompleted = selectedTaskForUpdate.progress === 100;

        await updateTask(selectedTaskForUpdate._id, {
            name: selectedTaskForUpdate.name,
            progress: selectedTaskForUpdate.progress,
            completed: isCompleted,
            time: selectedTaskForUpdate.time,
            date: selectedTaskForUpdate.date
        });

        // Reset selection
        selectedTaskForUpdate = null;

        // Redirect to All Tasks page
        showScreen('all-tasks-screen');

    } catch (error) {
        showModal('Update Failed', 'Error updating task: ' + error.message);
    }
}

// ===== Delete Tasks =====
function renderDeleteTasks(selectedDate = new Date()) {
    renderDateSelector('delete-tasks-date-selector', (date) => renderDeleteTasks(date), selectedDate);

    const container = document.getElementById('delete-tasks-list');
    if (!container) return;

    container.innerHTML = '';

    const filteredTasks = tasks.filter(task => isSameDate(task.date, selectedDate));

    if (filteredTasks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 40px;">No tasks found for this date</p>';
        return;
    }

    filteredTasks.forEach(task => {
        const taskItem = createSelectableTaskItem(task, 'delete');
        container.appendChild(taskItem);
    });
}

async function deleteSelectedTasks() {
    const selectedCheckboxes = document.querySelectorAll('#delete-tasks-list input[type="checkbox"]:checked');

    if (selectedCheckboxes.length === 0) {
        showModal('No Tasks Selected', 'Please select at least one task to delete');
        return;
    }

    const taskIdsToDelete = Array.from(selectedCheckboxes).map(cb => cb.value);

    // Custom Confirmation
    showModal(
        'Delete Tasks',
        `Are you sure you want to delete ${taskIdsToDelete.length} task(s)?`,
        async function () {
            try {
                await bulkDeleteTasks(taskIdsToDelete);
                showScreen('all-tasks-screen');
            } catch (error) {
                showModal('Error', 'Error deleting tasks: ' + error.message);
            }
        }
    );
}

// ===== Utility Functions =====
function formatDeadline(deadline) {
    if (!deadline) return 'No deadline';

    const parts = deadline.split(' ');
    if (parts.length < 2) return deadline;

    const date = parts[0];
    const time = parts[1];

    // Format: "31 May 10 AM"
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('default', { month: 'short' });

    // Convert 24h to 12h format
    const timeParts = time.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${day} ${month} ${hours} ${ampm}`;
}

// ===== Custom Modal Logic =====
function showModal(title, message, onConfirm = null) {
    const overlay = document.getElementById('custom-modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const inputEl = document.getElementById('modal-input');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    if (!overlay || !titleEl || !messageEl) return;

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    if (inputEl) inputEl.style.display = 'none';

    // Configure buttons
    // Remove old listeners to prevent stacking
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    // Cancel/Close logic
    newCancelBtn.onclick = function () {
        overlay.classList.remove('active');
    };

    // If it's just an alert (no confirm callback), hide Cancel button
    if (!onConfirm) {
        newCancelBtn.style.display = 'none';
        newConfirmBtn.onclick = function () {
            overlay.classList.remove('active');
        };
    } else {
        // Layout: Cancel | OK
        newCancelBtn.style.display = 'inline-block';
        newConfirmBtn.onclick = function () {
            overlay.classList.remove('active');
            onConfirm();
        };
    }

    // Show modal
    overlay.classList.add('active');
}

function showInputModal(title, message, defaultValue, inputType, onConfirm) {
    const overlay = document.getElementById('custom-modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    const inputEl = document.getElementById('modal-input');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    if (!overlay || !inputEl) return;

    titleEl.textContent = title;
    messageEl.textContent = message;

    inputEl.value = defaultValue;
    inputEl.type = inputType || 'text';
    inputEl.style.display = 'block';

    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newCancelBtn.style.display = 'inline-block';

    newCancelBtn.onclick = function () {
        overlay.classList.remove('active');
    };

    newConfirmBtn.onclick = function () {
        const value = inputEl.value;
        overlay.classList.remove('active');
        if (onConfirm) onConfirm(value);
    };

    overlay.classList.add('active');
    inputEl.focus();
}

function getRandomIcon() {
    const icons = ['💼', '🛒', '📚', '🎯', '💻', '📱', '🎨', '📝'];
    return icons[Math.floor(Math.random() * icons.length)];
}

function getRandomColor() {
    const colors = ['purple', 'blue', 'orange', 'green', 'pink'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');

    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function () {
            if (this.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
}

// Notifications Handler
// Notifications Handler
function setupNotificationHandler() {
    const notificationBtns = document.querySelectorAll('.notification-btn');

    notificationBtns.forEach(btn => {
        btn.onclick = function () {
            const today = new Date();
            const todaysTasks = tasks.filter(task => isSameDate(task.date, today) && !task.completed);

            if (todaysTasks.length === 0) {
                showModal('Notifications', 'No tasks due today!');
            } else {
                const taskNames = todaysTasks.map(t => `• ${t.name} (${t.time})`).join('\n');
                showModal('Tasks Due Today', `You have ${todaysTasks.length} task(s) due today:\n\n${taskNames}`);
            }
        };
    });
}

// Password Visibility Toggle
function setupPasswordToggle() {
    const toggleBtns = document.querySelectorAll('.password-toggle');

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const inputWrapper = this.closest('.input-wrapper');
            if (inputWrapper) {
                const passwordInput = inputWrapper.querySelector('input');
                if (passwordInput) {
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    this.textContent = type === 'password' ? '👁️' : '🔒';
                }
            }
        });
    });
}

// ===== Google Sign-In =====
function setupGoogleSignIn() {
    const googleButton = document.querySelector('.btn-google');
    if (googleButton) {
        googleButton.addEventListener('click', function (e) {
            e.preventDefault();
            // Redirect to Google OAuth endpoint
            window.location.href = `${API_BASE_URL}/auth/google`;
        });
    }
}

// ===== Local Storage (for auth only) =====
function saveAuthToStorage() {
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

function loadAuthFromStorage() {
    authToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
}

function clearAuthFromStorage() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
}

// ===== Delete Account =====
async function deleteAccount() {
    showModal(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone and will delete all your data.',
        async function () {
            try {
                const response = await apiRequest('/auth/delete', {
                    method: 'DELETE'
                });

                showModal('Account Deleted', 'Your account has been successfully deleted.', function () {
                    handleLogout();
                });
            } catch (error) {
                showModal('Error', 'Failed to delete account: ' + error.message);
            }
        }
    );
}
