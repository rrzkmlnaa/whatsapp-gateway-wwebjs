const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Create a user
const createUser = async (req, res) => {
  const { email, password, firstName, lastName, role, status } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password, // In production, ensure password is hashed before saving.
        firstName,
        lastName,
        role,
        status,
      },
    });
    res.send({ data: user, message: 'User created successfully' }); // Send data and message
  } catch (error) {
    if (error.name === 'PrismaClientKnownRequestError') {
      res.send({
        errorDetails: error.message,
        message: 'Database error occurred',
      });
    } else {
      res.send({ errorDetails: error.message, message: 'Error creating user' });
    }
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        status: true,
      },
    });
    res.send({ data: users, message: 'Users fetched successfully' });
  } catch (error) {
    console.log(error);
    if (error.name === 'PrismaClientKnownRequestError') {
      res.send({
        errorDetails: error.message,
        message: 'Database error occurred',
      });
    } else {
      res.send({ errorDetails: error.message, message: 'Failed to get users' });
    }
  }
};

// Get a single user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!user) {
      return res.send({
        message: 'User not found',
        errorDetails: 'User does not exist in the database',
      });
    }
    res.send({ data: user, message: 'User fetched successfully' }); // Send data and message
  } catch (error) {
    res.send({ errorDetails: error.message, message: 'Error fetching user' });
  }
};

// Update a user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName, role, status } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id, 10) },
      data: {
        email,
        firstName,
        lastName,
        role,
        status,
      },
    });
    res.send({ data: user, message: 'User updated successfully' }); // Send data and message
  } catch (error) {
    res.send({ errorDetails: error.message, message: 'Error updating user' });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.delete({
      where: { id: parseInt(id, 10) },
    });
    res.send({ data: user, message: 'User deleted successfully' }); // Send data and message
  } catch (error) {
    res.send({ errorDetails: error.message, message: 'Error deleting user' });
  }
};

/**
 * Login a user
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @returns {object} - Response object
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(404).send({ error: 'User not found.' });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).send({ error: 'Invalid password.' });
  }

  // Check user status
  if (user.status !== 'ACTIVE') {
    return res.status(403).send({ error: `Your account is ${user.status}.` });
  }

  // Generate JWT
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1h' }, // Token expiration
  );

  res.send({ message: 'Login successful', token });
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
};
