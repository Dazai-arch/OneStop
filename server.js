const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const multer = require('multer');

const socketIO = require('socket.io');
const http = require('http');
const cookieParser = require("cookie-parser");
const sharedSession = require('express-socket.io-session');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads'); // Set destination for uploads
  },
  filename: (req, file, cb) => {
      // Use original filename and append a timestamp to avoid name conflicts
      const ext = path.extname(file.originalname); // Get the original file extension
      const fileName = `${Date.now()}${ext}`; // Append timestamp to avoid conflicts
      cb(null, fileName);
  }
});

const upload = multer({ storage: storage });





dotenv.config();
const app = express();
const port = 3000;
const server = http.createServer(app);
const io = socketIO(server);



app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "./frontend")));
app.use(express.static(path.join(__dirname, "./Profileimage")));
app.use(express.static(path.join(__dirname, "./assets")));
app.use('./uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cookieParser())

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  dbName: process.env.DB_NAME,
  collectionName: "sessions",
});
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  cookie: { secure: false, maxAge: 5 * 60 * 1000 },
});

app.use(sessionMiddleware);

// Attach the session middleware to Socket.IO
io.use(sharedSession(sessionMiddleware, {
  autoSave: true, // Automatically save session changes
}));

// Set up session middleware
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: true,
//     store: sessionStore,
//     cookie: { secure: false, maxAge: 5 * 60 * 1000 },
//   })
// );

// io.use((socket, next) => {
//   const req = socket.request;

//   // Parse cookies from the request headers
//   if (req.headers.cookie) {
//       req.cookies = cookieParser.JSONCookies(cookieParser(req.headers.cookie));
//   } else {
//       req.cookies = {};
//   }

//   const sessionId = req.cookies['connect.sid']; // Ensure this matches the cookie set in your session middleware
//   console.log('Session ID:', sessionId);

//   // Retrieve session from the session store
//   sessionStore.get(sessionId, (err, session) => {
//       if (err || !session) {
//           console.log("Session not found or error:", err);
//           return next(new Error("Unauthorized")); // Reject connection if session not found
//       }

//       req.session = session; // Attach session to socket request
//       console.log("Session found:", req.session); // Log session for debugging
//       next(); // Proceed with the connection
//   });
// });

const mongoURI = process.env.MONGO_URI;
const dbNAME = process.env.DB_NAME;

mongoose
  .connect(mongoURI, {
    dbName: dbNAME,
  })
  .then(() => {
    console.log("Connected to MongoDB successfully!");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });



// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected");

  // Access the session via socket.handshake.session
  const userId = socket.handshake.session.userId; // Use handshake instead of request
  const username = socket.handshake.session.userName;
  console.log("Session userId:", userId); // Debugging

  // If there's no userId, the user is not authenticated
  if (!userId) {
      console.log("User not authenticated via WebSocket");
      socket.disconnect(true); // Disconnect the user if not authenticated
      return;
  }

  // Join a project room
  socket.on('joinRoom', (roomId) => {
      if (typeof roomId !== 'string') {
          console.error(`Invalid roomId: ${roomId}`);
          return;
      }
      
      const room = io.sockets.adapter.rooms.get(roomId) || new Set();

      if (room.size >= 7) {
          socket.emit('roomFull', 'This project already has 7 collaborators.');
          return;
      }

      socket.join(roomId);
      console.log(`User ${userId} joined room ${roomId}`);
  });

  // Handle sending messages
  socket.on("sendMessage", async (data) => {
      const { roomId, messageText, filePath, fileName } = data;

      if (!roomId) {
          console.error("No roomId provided when sending message");
          return;
      }

      // Create and save the message
      const message = new Message({
          projectId: roomId, // Ensure projectId is passed
          sender: userId,
          senderName: username,
          text: messageText,
          filePath: filePath || null,
          fileName: fileName || null, // Include filePath if it exists
      });

      try {
          await message.save(); // Save the message to the database
          socket.to(roomId).emit("receiveMessage", { messageText, filePath, fileName, userId, username}); // Broadcast message to the room
      } catch (error) {
          console.error("Error saving message:", error);
      }
  });
  

  socket.on("disconnect", () => {
      console.log("A user disconnected");
  });
});

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next(); // User is authenticated, proceed to the next middleware or route handler
  }else {
    return res.redirect('/html/login.html'); // Redirect to login page if not logged in
  }
  // return res.status(401).json({ message: "Unauthorized access. Please log in." }); // Not logged in, return an error or redirect
}


const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  designation: { type: String, required: true },
  password: { type: String, required: true },
  image: { type: String, default: null },
  date: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/html/home.html"));
});
// app.post('/upload-file', upload.single('file'), (req, res) => {
//   res.status(200).json({ filePath: req.file.path });
// });

app.post("/signup", async (req, res) => {
  const { email, username, designation, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`Signup attempt with existing email: ${email}`);
      return res
        .status(400)
        .json({ message: `Email ${email} is already in use.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      username,
      designation,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();
    console.log(`New user signed up: Email: ${email}, Username: ${username}`);

    // Store the user ID in the session
    req.session.userId = savedUser._id;

    if (req.session.invitationDetails) {
      const { projectId } = req.session.invitationDetails;

      // Add the new user as a collaborator to the project
      await Project.findByIdAndUpdate(projectId, {
          $addToSet: { collaborators: savedUser._id },
      });
      console.log(`User ${email} added to project ID: ${projectId}`);

      // Clear invitation details from session
      delete req.session.invitationDetails;
    }

    res.status(201).json({ message: "Signup successful!" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Signup failed. Please try again." });
  }
});

app.post("/save-profile-image", async (req, res) => {
  const { imagePath } = req.body;

  // Get user ID from the session
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!imagePath) {
    return res.status(400).json({ message: "No image path provided" });
  }

  try {
    // Update the user document with the selected image path
    await User.findByIdAndUpdate(userId, { image: imagePath });

    console.log(
      `Profile image updated for user ID: ${userId}, Image path: ${imagePath}`
    );

    res.status(200).json({ message: "Profile image saved!" });
  } catch (error) {
    console.error("Error saving profile image:", error);
    res.status(500).json({ message: "Failed to save profile image" });
  }
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      console.log(`Password mismatch for user: ${email}`);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Store the user ID in the session after login
    req.session.userId = user._id;
    req.session.userName = user.username;
    const userid = req.session.userId;
    const username = req.session.userName;

    console.log(`User logged in: ${email} and user id: ${userid}`);
    res.status(200).json({ message: "Login successful.", userId: user._id });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Login failed due to an error." });
  }
});



let resetCodes = {};

app.post("/send-reset-code", async (req, res) => {
  const { email } = req.body;

  try {
    console.log("Received email:", email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("Email not found:", email);
      return res.status(400).json({ message: "Email not found" });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes[email] = resetCode;
    console.log("Generated reset code:", resetCode);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code for OneStop is: ${resetCode}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending mail:", err);
        return res.status(500).json({ message: "Error sending reset code" });
      }
      console.log("Email sent:", info.response);
      res.json({ message: "Reset code sent to your email!" });
    });
  } catch (error) {
    console.error("Error in /send-reset-code:", error);
    res.status(500).json({ message: "An error occurred during the request." });
  }
});

app.post("/verify-reset-code", async (req, res) => {
  const { email, code } = req.body;

  if (resetCodes[email] && resetCodes[email] === code) {
    return res.json({
      success: true,
      message: "Code verified, proceed to reset your password",
    });
  }

  res.status(400).json({ success: false, message: "Invalid reset code" });
});

app.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    user.password = hashedPassword;
    await user.save();

    delete resetCodes[email];

    res.json({ message: "Password reset successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password." });
  }
});


app.get("/profile",async (req, res) => {
  // Get user ID from session
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send user details to the frontend
    res.status(200).json({
      username: user.username,
      email: user.email,
      designation: user.designation,
      date: user.date,
      image: user.image, // Fallback if no image is set
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch profile data." });
  }
});


// Generate a verification code and send it to the user's email
app.post("/send-verification-code", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await User.findById(userId);
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store the verification code in the session for later verification
  req.session.verificationCode = verificationCode;

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: user.email,
    subject: "Email Verification Code",
    text: `Your verification code for OneStop is: ${verificationCode}`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending mail:", err);
      return res.status(500).json({ message: "Error sending verification code" });
    }
    console.log("Verification email sent:", info.response);
    res.json({ message: "Verification code sent to your email!" });
  });
});

// Verify the code entered by the user
app.post("/verify-code", async (req, res) => {
  const { code } = req.body;
  const userId = req.session.userId;

  // Check if the verification code matches
  if (req.session.verificationCode === code) {
      // Clear the verification code after successful verification
      delete req.session.verificationCode;

      // Set a flag indicating that the user has been verified
      req.session.isVerified = true;

      return res.json({ success: true });
  }

  // If the code is invalid and the user is not verified
  if (userId && !req.session.isVerified) {
      // Delete the user's data from the database
      await User.findByIdAndDelete(userId);
  }

  res.status(400).json({ success: false, message: "Invalid verification code" });
});

// Delete user data if the window is closed
app.delete("/delete-user-data", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Delete the user from the database
    await User.findByIdAndDelete(userId);
    req.session.destroy(); // Destroy the session
    console.log(`User data deleted for user ID: ${userId}`);
    res.status(200).json({ message: "User data deleted." });
  } catch (error) {
    console.error("Error deleting user data:", error);
    res.status(500).json({ message: "Failed to delete user data." });
  }
});



app.post("/logout", (req, res) => {
  // Destroy the session and clear the session cookie
  req.session.destroy((err) => {
      if (err) {
          console.error("Error logging out:", err);
          return res.status(500).json({ message: "Failed to log out." });
      }

      // Clear session cookie to ensure the session is fully terminated
      res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: false, // Set true if using HTTPS
      });

      // Redirect to the home page
      res.status(200).json({ message: "Logged out successfully." });
  });
});


// projects routers
// Project Schema
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  selectedResources: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

// Compound index to ensure project name is unique per user
projectSchema.index({ name: 1, owner: 1 }, { unique: true });

const Project = mongoose.model("Project", projectSchema);


// Create Project Endpoint
app.post("/api/projects", async (req, res) => {
  const { name } = req.body;
  const userId = req.session.userId;

  // Log the data being sent in the request body
  //console.log("Request body:", req.body);

  // Log the user ID from the session
  //console.log("User ID from session:", userId);

  if (!userId) {
    return res.status(400).json({ message: "User not authenticated. Please log in again." });
  }

  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Project name is required." });
  }

  try {
    // Create the new project
    const newProject = new Project({
      name,
      owner: userId,
    });

    await newProject.save();
    res.status(201).json({ message: "Project created successfully!", project: newProject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: `A project named "${name}" already exists for this user.` });
    }
    console.error("Error creating project:", error);
    res.status(500).json({ message: "An error occurred while creating the project." });
  }
});

app.post('/api/select-project', (req, res) => {
  const { projectId } = req.body;

  if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required' });
  }

  // Store the project ID in the session
  req.session.projectId = projectId;

  // Send a success response
  res.json({ success: true });
});

app.get('/api/get-selected-project', (req, res) => {
  const projectId = req.session.projectId;
  if (projectId) {
      res.json({ success: true, projectId });
  } else {
      res.json({ success: false });
  }
});


// Delete Project Endpoint
// Delete Project Endpoint
app.delete("/api/projects/:id", async (req, res) => {
  const projectId = req.params.id;
  const userId = req.session.userId;

  try {
    // Find the project by its ID
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Check if the user owns the project
    if (!project.owner.equals(userId)) {
      return res.status(403).json({ message: "You are not authorized to delete this project." });
    }

    // Delete the project
    await Project.findByIdAndDelete(projectId);
    res.status(200).json({ message: "Project deleted successfully!" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "An error occurred while deleting the project." });
  }
});

app.get('/api/project', async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
      console.warn('Unauthorized access attempt.');
      return res.status(403).json({ message: 'User not authenticated' });
  }

  try {
      // Fetch projects where the user is the owner or a collaborator
      const projects = await Project.find({ 
          $or: [{ owner: userId }, { collaborators: userId }] 
      }).populate('collaborators', 'username').lean();
      //console.log('Serialized projects fetched from DB:', projects)

        // console.log('Serialized projects fetched from DB:', serializedProjects); 
      // Respond with the fetched projects
      res.status(200).json(projects); 
  } catch (error) {
      console.error("Error fetching projects:", error);
      // Return error message with a status code of 500
      res.status(500).json({ message: "An error occurred while fetching projects." });
  }
});


// Task Schema
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['New', 'Planned', 'In Progress', 'Completed'], default: 'New' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignee:{ type: String, required: true },
  dueDate: { type: Date }, 
  impact: { type: String },
  budget: { type: String },
  currency: { type: String, default: 'USD' },
  members: [{ name: String }],
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});


const Task = mongoose.model("Task", taskSchema);

// Create Task Endpoint
app.post("/api/tasks", async (req, res) => {
  const { title, description, status, assignee , dueDate, impact, budget} = req.body;
  const userId = req.session.userId;
  const projectId = req.session.projectId;
  if (!projectId) {
     return res.status(400).json({ message: "No project selected." });
  }

  try {
     const newTask = new Task({
        title,
        description,
        status,
        assignee, // Save assignee
        owner: userId,
        projectId: projectId,
        members: [],
        dueDate, // Store dueDate
        impact, // Store impact
        budget, // Initialize members
     });

     const savedTask = await newTask.save();
     res.status(201).json({ message: "Task created successfully!", task: savedTask });
  } catch (error) {
     console.error("Error creating task:", error);
     res.status(500).json({ message: "An error occurred while creating the task." });
  }
});



// Fetch Tasks Endpoint
app.get("/api/tasks", async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.session.projectId;  // Get projectId from session

  if (!projectId) {
      return res.status(400).json({ message: "No project selected." });
  }

  try {
      // Fetch tasks for the project owner and collaborators
      const tasks = await Task.find({ projectId: projectId })  // Fetch all tasks for the project
          .populate('assignee', 'username image') // Populate assignee's username and image
          .populate('owner', 'username image') // Populate owner's username and image if needed
          .populate('collaborators', 'username image');

      res.status(200).json(tasks);
  } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "An error occurred while fetching tasks." });
  }
});

// Update Task Endpoint
app.put("/api/tasks/:id", async (req, res) => {
  const taskId = req.params.id;
  const userId = req.session.userId;
  const { members, status, assignee } = req.body; // Capture updated assignee

  try {
     const updatedTask = await Task.findOneAndUpdate(
        { _id: taskId, projectId: req.session.projectId },
        req.body, // Use req.body directly to update all fields
        { new: true }
     );

     if (!updatedTask) {
        return res.status(404).json({ message: "Task not found." });
     }
     io.to(updatedTask.projectId).emit('taskUpdated', updatedTask);
     res.status(200).json({ message: "Task updated successfully!", task: updatedTask });
  } catch (error) {
     console.error("Error updating task:", error);
     res.status(500).json({ message: "An error occurred while updating the task." });
  }
});

// Delete Task Endpoint
app.delete("/api/tasks/:id", async (req, res) => {
  const taskId = req.params.id;
  const userId = req.session.userId;

  try {
    const task = await Task.findOneAndDelete({ _id: taskId, projectId: req.session.projectId });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.status(200).json({ message: "Task deleted successfully!" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "An error occurred while deleting the task." });
  }
});

// ... (remaining code)
app.post("/api/save-resources", async (req, res) => {
  const { resources } = req.body; // Project ID is no longer needed in the body
  const userId = req.session.userId;
  const projectId = req.session.projectId; // Get projectId from the session

  if (!userId || !projectId) {
      return res.status(400).json({ message: "User or project not specified" });
  }

  try {
      // Update the resources for the selected project
      await Project.findOneAndUpdate(
          { _id: projectId, $or: [{ owner: userId }, { collaborators: userId }] },
          { selectedResources: resources },
          { new: true }
      );
      res.status(200).json({ message: "Resources saved successfully!" });
  } catch (error) {
      console.error("Error saving resources:", error);
      res.status(500).json({ message: "Failed to save resources" });
  }
});
app.get("/api/get-resources", async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.session.projectId; // Get projectId from the session

  if (!userId || !projectId) {
      return res.status(400).json({ message: "User or project not specified" });
  }

  try {
      // Find the project by ID and check if the user is either the owner or a collaborator
      const project = await Project.findOne({
          _id: projectId,
          $or: [{ owner: userId }, { collaborators: userId }] // Check for ownership or collaboration
      });

      if (!project) {
          return res.status(404).json({ message: "Project not found" });
      }

      res.status(200).json({ selectedResources: project.selectedResources });
  } catch (error) {
      console.error("Error retrieving resources:", error);
      res.status(500).json({ message: "Failed to retrieve resources" });
  }
});


//Collaborators Routes



const messageSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user
  text: { type: String },
  filePath: { type: String },
  fileName: { type: String }, // Optional: Store file path if the message includes a file
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

app.post('/invite-collaborator', async (req, res) => {
  const { projectId, collaboratorEmail } = req.body;

  // Check if collaboratorEmail is provided
  if (!collaboratorEmail) {
      return res.status(400).json({ message: 'Email is required.' });
  }
  try {
      // Check if the collaborator exists in the database
      const existingUser = await User.findOne({ email: collaboratorEmail });
      
      const project = await Project.findById(projectId);
      if (!project) {
          return res.status(404).json({ message: 'Project not found.' });
      }
      if (existingUser && existingUser._id.equals(project.owner)) {
        return res.status(400).json({ message: 'Cannot invite the project owner as a collaborator.' });
    }

    // Check if the user is already a collaborator
    if (existingUser && project.collaborators.includes(existingUser._id)) {
        return res.status(409).json({ message: 'User is already a collaborator on this project.' });
    }

      // Create the email transporter
      const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
              user: process.env.EMAIL,
              pass: process.env.EMAIL_PASSWORD,
          },
      });

      // Construct the acceptance link
      const host = req.get('host'); 
      const protocol = req.protocol; 
      const link = `${protocol}://${host}/accept-invitation/${projectId}/${encodeURIComponent(collaboratorEmail)}`;

      // Define email options
      const mailOptions = {
          from: process.env.EMAIL,
          to: collaboratorEmail, // Make sure this is correctly set
          subject: 'Project Invitation',
          text: `You have been invited to join the project. Click the link to accept: ${link}`,
      };

      // Send the invitation email
      await transporter.sendMail(mailOptions);

      // Respond with a success message
      res.status(200).json({ message: 'Invitation sent! User can sign up to accept the invitation.' });
  } catch (error) {
      console.error('Error inviting collaborator:', error); // Log the error details for debugging
      res.status(500).json({ message: 'Error inviting collaborator. Please try again.' });
  }
});



app.get('/accept-invitation/:projectId/:email', async (req, res) => {
  const { projectId, email } = req.params; // Get projectId and email from URL parameters
  console.log("Project ID:", projectId); // Log projectId
  console.log("Email:", email); // Log email

  // Validate the project ID
  if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
  }

  try {
      // Check if the user exists in the database
      let user = await User.findOne({ email });

      // If the user does not exist, create a new user
      if (!user) {
        console.log(`User not found for email: ${email}. Redirecting to signup.`);
        req.session.invitationDetails = { projectId, email }; // Store in session
        return res.redirect('/html/signup.html');
      }

      // Fetch the project to check if it exists
      const project = await Project.findById(projectId);
      if (!project) {
          return res.status(404).json({ message: 'Project not found.' });
      }

      // Check if user is already a collaborator
      if (project.collaborators.includes(user._id)) {
          return res.status(409).json({ message: 'User is already a collaborator on this project.' });
      }

      // Update the project to add the user as a collaborator
      await Project.findByIdAndUpdate(projectId, { $addToSet: { collaborators: user._id } });
      
      await Task.updateMany(
        { projectId: projectId }, // Find all tasks for this project
        { $addToSet: { collaborators: user._id } } // Add collaborator to each task
    );
      // Redirect or respond with success
      res.redirect('/html/login.html'); // Redirect to a success page or a login page
  } catch (error) {
      console.error('Error accepting invitation:', error); // Log any errors for debugging
      res.status(500).json({ message: 'Error accepting invitation' });
  }
});


app.get('/api/get-invitation-details', (req, res) => {
  if (req.session.invitationDetails) {
      return res.json({ success: true, invitationDetails: req.session.invitationDetails });
  }
  return res.json({ success: false });
});




app.post('/upload-file', upload.single('file'), (req, res) => {
  if (req.file) {
    const originalFileName = req.file.originalname; // Get the original file name
    const savedFilePath = `./uploads/${originalFileName}`.replace(/\\/g, '/'); // Save the file with the original name

    fs.rename(req.file.path, savedFilePath, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error saving file' });
      }

      // Respond with the saved file path and the original file name
      res.status(200).json({
        filePath: savedFilePath,
        fileName: originalFileName
      });
    });
  } else {
    res.status(400).json({ message: 'File upload failed.' });
  }
});

app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  res.download(filePath, (err) => {
      if (err) {
          console.error("Error downloading file:", err);
          res.status(500).send('Could not download the file.');
      }
  });
});

app.get("/api/messages/:projectId", async (req, res) => {
  const { projectId } = req.params;

  try {
      // Fetch all messages for the project and populate sender information
      const messages = await Message.find({ projectId })
          .populate("sender", "username") // Populate the username
          .sort("timestamp"); // Sort messages by timestamp

      res.status(200).json(messages); // Send the messages back to the client
  } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages." });
  }
});

app.get('/api/session-info', (req, res) => {
  if (!req.session.userId || !req.session.projectId) {
      return res.status(400).json({ message: 'User ID or Project ID not found in session.' });
  }
  res.json({
      userId: req.session.userId,
      projectId: req.session.projectId,
      username: req.session.userName
  });
});

// Fetch user details by ID
app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
      const user = await User.findById(userId, 'username'); // Fetch only the username
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user); // Respond with user data
  } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user.' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
      // Fetch all users from the database
      const users = await User.find({}, 'username _id'); // Select only username and _id fields

      // Send the user data back as a JSON response
      res.status(200).json(users);
  } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users." });
  }
});
app.get('/api/projects/collaborators', async (req, res) => {
  const projectId = req.session.projectId; // Get project ID from the session

  if (!projectId) {
      return res.status(400).json({ message: 'Project ID not found in session.' });
  }

  try {
      // Fetch the project with collaborators
      const project = await Project.findById(projectId)
          .populate('collaborators', 'username _id image'); // Populate collaborators with username, id, and image

      if (!project) {
          return res.status(404).json({ message: 'Project not found' });
      }

      // Get the owner details
      const owner = await User.findById(project.owner, 'username _id image'); // Fetch owner details

      // Return the collaborators along with the owner
      res.status(200).json({
          collaborators: project.collaborators,
          owner: owner // Send the owner details as well
      });
  } catch (error) {
      console.error('Error fetching collaborators:', error);
      res.status(500).json({ message: 'Failed to fetch collaborators.' });
  }
});

// time spent by user
let userTimeLogs = {};

app.use((req, res, next) => {
  const userId = req.session.userId;

  if (userId) {
      if (!userTimeLogs[userId]) {
          userTimeLogs[userId] = { loginTime: Date.now(), totalTime: 0 };
      } else {
          // Update total time only if the session has not been reset
          userTimeLogs[userId].totalTime += Math.floor((Date.now() - userTimeLogs[userId].loginTime) / 1000); // Accumulate in seconds
          userTimeLogs[userId].loginTime = Date.now(); // Reset login time
      }
  }
  next();
});


app.get('/api/time-spent', (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const totalTimeInSeconds = userTimeLogs[userId] ? userTimeLogs[userId].totalTime : 0;
    const totalTimeInMinutes = totalTimeInSeconds / 60; // Convert seconds to minutes
    res.json({ totalTime: totalTimeInMinutes });
});

//total budget
app.get('/api/total-budget', async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.session.projectId;

  try {
      const tasks = await Task.find({ projectId: projectId });

      // Log the fetched tasks for debugging
      // console.log("Fetched Tasks:", JSON.stringify(tasks, null, 2));

      if (tasks.length === 0) {
          return res.json({ totalBudgets: {} }); // No tasks, return an empty object
      }

      // Object to store total budgets by currency
      // Object to store total budgets by currency
// Object to store total budgets by currency
const totalBudgetsByCurrency = {};

// Assuming tasks is an array of task objects
tasks.forEach(task => {
    // Clean the budget string by removing non-numeric characters (except for decimal point and minus sign)
    const budgetString = task.budget || '0'; // Default to '0' if budget is undefined

    // Remove non-numeric characters and convert to a float
    const budgetValue = budgetString.replace(/[^0-9.-]+/g, ""); // Remove non-numeric characters
    const budget = parseFloat(budgetValue); // Convert the cleaned string to a number

    // Extract currency symbol from the original budget string
    const currencyMatch = budgetString.match(/[^\d\s.-]+/g);
    const currency = currencyMatch ? currencyMatch[0] : null; // Set to null if no currency found

    // Log the budget and currency for debugging
    // console.log(`Task: ${task.title}, Budget: ${budgetString}, Currency: ${currency ? currency : '0'}`);

    // Validate the budget
    if (isNaN(budget)) {
        console.error(`Invalid budget for task: ${task.title}`); // Log error for invalid budget
        return; // Skip this task if budget is invalid
    }

    // Skip if currency is not found
    if (!currency) {
        console.error(`Currency not found for task: ${task.title}. Skipping.`);
        return; // Skip this task if currency is not found
    }

    // Initialize the currency in the totalBudgetsByCurrency object if it doesn't exist
    if (!totalBudgetsByCurrency[currency]) {
        totalBudgetsByCurrency[currency] = 0;
    }

    // Sum the budget for the respective currency
    totalBudgetsByCurrency[currency] += budget;
});

// Now you can log or return the totalBudgetsByCurrency for further processing
// console.log("Total Budgets by Currency:", totalBudgetsByCurrency);


// Now you can log or return the totalBudgetsByCurrency for further processing



      // Log the final total budgets by currency
      // console.log(`Total Budgets by Currency:`, totalBudgetsByCurrency);

      // Respond with the total budgets for each currency
      res.json({ totalBudgets: totalBudgetsByCurrency });
  } catch (error) {
      console.error("Error calculating budget:", error);
      res.status(500).json({ message: "Failed to calculate budget." });
  }
});








app.get('/api/user-projects-count', async (req, res) => {
  const userId = req.session.userId;
  
  try {
    const projectCount = await Project.countDocuments({ owner: userId });
    const projectc = projectCount + 1;
    res.json({ projectc });
  } catch (error) {
    console.error("Error fetching project count:", error);
    res.status(500).json({ message: "Failed to fetch project count." });
  }
});

app.get('/api/tasks/filtered', async (req, res) => {
  const projectId = req.session.projectId;

  try {
    const importantTasks = await Task.find({ projectId: projectId, status: 'In Progress' });
    const oldTasks = await Task.find({ projectId: projectId, status: { $in: ['Completed'] } });

    res.json({ importantTasks, oldTasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks." });
  }
});

app.get("/api/resources-count", async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.session.projectId; // Get projectId from the session

  if (!userId || !projectId) {
    return res.status(400).json({ message: "User or project not specified" });
  }

  try {
    // Find the project and check if the user is either the owner or a collaborator
    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: userId }, { collaborators: userId }] // Check ownership or collaboration
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Count the resources in the project
    const resourceCount = project.selectedResources.length;

    // You can also add +1 to the resource count if needed
    const resourceCountWithIncrement = resourceCount; // Increment by 1

    res.status(200).json({ resourceCount: resourceCountWithIncrement });
  } catch (error) {
    console.error("Error fetching resource count:", error);
    res.status(500).json({ message: "Failed to fetch resource count." });
  }
});


//project summary
app.get('/api/taskprojects', async (req, res) => {
  try {
      const projectId = req.session.projectId; // Get the projectId from the session

      // Fetch tasks associated with the project
      const tasks = await Task.find({ projectId: projectId }).populate('owner'); // Populate owner for additional user details if needed

      // Send the tasks back as a response
      res.json(tasks);
  } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks." });
  }
});

app.get('/api/managers', async (req, res) => {
  try {
      const projectId = req.session.projectId; // Retrieve projectId from the session

      if (!projectId) {
          return res.status(400).json({ message: "Project ID not found in session." });
      }

      // Find unique assignees from tasks for the given project
      const assignees = await Task.find({ projectId })
          .distinct('assignee'); // Get unique assignees

      res.json(assignees); // Return the list of assignees
  } catch (error) {
      console.error("Error fetching assignees:", error);
      res.status(500).json({ message: "Failed to fetch assignees." });
  }
});


app.get('/api/statuses', (req, res) => {
  const statuses = ['New', 'Planned', 'In Progress', 'Completed']; // Example statuses
  res.json(statuses);
});

app.get('/api/tasks/assignee/:assignee', async (req, res) => {
  try {
      const { assignee } = req.params;
      const projectId = req.session.projectId; // Assuming projectId is stored in session

      const tasks = await Task.find({ projectId, assignee });
      res.json(tasks);
  } catch (error) {
      console.error("Error fetching tasks by assignee:", error);
      res.status(500).json({ message: "Failed to fetch tasks." });
  }
});

app.get('/api/tasks/status/:status', async (req, res) => {
  try {
      const { status } = req.params;
      const projectId = req.session.projectId; // Assuming projectId is stored in session

      const tasks = await Task.find({ projectId, status });
      res.json(tasks);
  } catch (error) {
      console.error("Error fetching tasks by status:", error);
      res.status(500).json({ message: "Failed to fetch tasks." });
  }
});

app.get('/api/workload/:projectId', async (req, res) => {
  const { projectId } = req.params; // Get the project ID from the URL
  const { timeRange } = req.query; // Get the time range from the query parameter
  const currentDate = new Date();
  let startDate;

  // Determine start date based on the selected time range
  switch (timeRange) {
      case 'Last 3 months':
          startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3));
          break;
      case 'Last 6 months':
          startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
          break;
      case 'Last year':
          startDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1));
          break;
      default:
          return res.status(400).json({ message: 'Invalid time range' });
  }

  try {
      // Fetch tasks associated with the specified project within the specified time range
      const tasks = await Task.find({
          projectId: projectId,
          createdAt: { $gte: startDate } // Filter tasks created after the start date
      });

      const workloadData = {};

      // Count tasks per assignee
      tasks.forEach(task => {
          const assignee = task.assignee; // Get the assignee's name

          if (!workloadData[assignee]) {
              workloadData[assignee] = 0; // Initialize if not already present
          }

          workloadData[assignee]++; // Increment count for this assignee
      });

      res.json(workloadData); // Send the workload data back as a response
  } catch (error) {
      console.error("Error fetching workload data:", error);
      res.status(500).json({ message: "Failed to fetch workload data." });
  }
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
