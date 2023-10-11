const express = require('express');
const bodyParser = require('body-parser');
const port=process.env.PORT || 5503;
const client = require('./connection.js'); 
const ejs = require('ejs');
const app = express();
const { check, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true, maxAge: 3600 });

//Views directory 
app.set('views', 'views')
// View engine
app.set('view engine', 'ejs');

// API middlewares ---
// CSRF middleware
app.use(cookieParser());
app.use(csrfProtection);
app.use((req, res, next) => {
	res.locals.csrfToken = req.csrfToken();
	next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Accept data, parse JSON requests and sanitise input 
app.use(express.json());
//Decode and parse URL form data sent through html form 
app.use(express.urlencoded({ extended: true })); 

// Correct path to serve static files 
app.use(express.static('/Users/reginasun/Desktop/DSS/Blog_System'));

// CSRF token validation middleware
const validateCSRFToken = (req, res, next) => {
	if (req.csrfToken() !== req.body._csrf) {
	  return res.status(403).send('Invalid CSRF token');
	}
	next();
  };

//API routes ----
// Validation rules 
//const browsePostValidate = [
	// Input validation and sanitisation 
//	check('query').notEmpty().withMessage('Search query is required').isLength({ max: 50 }).withMessage('Search query must be maximum 50 characters').trim().escape()
 // ];

// GET request --> Retreieve all post data from database 
app.get('/browse', (req, res) => {
	const { query } = req.query;

	//Validation errors
	//const errors = validationResult(req);
	//if (!errors.isEmpty()) {
	  // Handle validation errors
	//  return res.status(400).json({ errors: errors.array() });
	//}

    // Retrieve specific post searched for 
	if (query) {
	  const searchQuery = `%${query}%`;
	  // Placeholders and parameterised queries to ensure user input as data 
	  const search = 'SELECT * FROM post WHERE title ILIKE $1 OR content ILIKE $1';
 	  const values = [searchQuery];
      // Return specific row of data from database or throw error if issue executing query  
 	  client.query(search, values, (error, result) => {
		if (error) {
		  console.error('Error executing query', error);
		  res.status(500).send('An error occurred while searching the database.');
		} else {
		  const posts = result.rows;
		  res.render('Browse.ejs', { posts: posts });
		}
	  });
	} else {
	  // Retreieve all post data from database 
	  const query = 'SELECT * FROM post';
      // Retrieve data or throw error if issue executing query  
	  client.query(query, (error, result) => {
		if (error) {
		  console.error('Error executing query', error);
		  res.status(500).send('An error occurred while retrieving data from the database.');
		} else {
		  const posts = result.rows;
		  res.render('Browse.ejs', { posts: posts });
		}
	  });
	}
  });

  // GET request --> Retrieve post data from database to display in manage tab to allow edit or delete 
  app.get('/posts', (req, res) => {
	const query = 'SELECT * FROM post';
	// Retrieve data or throw error if issue executing 
	client.query(query, (error, result) => {
	  if (error) {
		console.error('Error executing query', error);
		res.status(500).send('An error occurred while retrieving data from the database.');
	  } else {
		const posts = result.rows;
		res.render('Posts.ejs', { posts: posts});
	  }
	});
  });

// Validation rules
const CreatePostValidate = [
	// Input validation and sanitisation 
	check('title').notEmpty().withMessage('Title is required').trim().escape(),
	check('content').notEmpty().withMessage('Content is required').isLength({ min: 10}).withMessage('Length of minimum 10 characters required.').trim().escape()
  ];
// POST request --> Create post with user inputted data that is validated 
app.post('/formPost', CreatePostValidate, validateCSRFToken, (req, res) => {
	const { title, content } = req.body;
  
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
	  return res.status(400).json({ errors: errors.array() });
	}
  
  	const query = 'INSERT INTO post(title, content) VALUES ($1, $2)';
  	const values = [title, content];
  
	client.query(query, values, (error, result) => {
	if (error) {
	console.error('Error executing query', error);
	res.status(500).send('An error occurred while saving the data.');
	} else {
	res.send('<script>alert("Post created successfully!"); window.location.href="/posts";</script>');
	}
  });
});

// Validation rules
const updatePostValidate = [
	// Input validation and sanitisation 
	check('title').notEmpty().withMessage('Title is required').trim().escape(),
	check('content').notEmpty().withMessage('Content is required').isLength({ min: 10}).withMessage('Length of minimum 10 characters required.').trim().escape()
];
// PUT request --> Update post in manage and browse
app.put('/posts/:id', updatePostValidate, (req, res) => {
  	const postId = req.params.id;
  	const { title, content } = req.body;

  	// Validation errors
  	const errors = validationResult(req);
  	if (!errors.isEmpty()) {
    // Handle validation errors
    	return res.status(400).json({ errors: errors.array() });
  	}

  	// Placeholders and parameterized queries to ensure user input as data
  	const query = 'UPDATE post SET title = $1, content = $2 WHERE id = $3';
  	const values = [title, content, postId];

  	// Update post or throw error if issue executing query
  	client.query(query, values, (error, result) => {
    if (error) {
      	console.error('Error executing query', error);
      	res.status(500).send('An error occurred while updating the post.');
    } else {
      	console.log('Post updated successfully.');
      	res.sendStatus(200);
    	}
  	});
});

// DELETE request --> Remove post from manage and browse 
app.delete('/posts/:id', (req, res) => {
	const postId = req.params.id;
	// Placeholders and parameterised queries to ensure user input as data 
	const query = 'DELETE FROM post WHERE id = $1';
	const values = [postId];
    // Delete post or throw error if issue executing query 
	client.query(query, values, (error, result) => {
	  if (error) {
		console.error('Error executing query', error);
		res.status(500).send('An error occurred while removing the post.');
	  } else {
		// window pop up 
		res.send('<script>alert("Post deleted successfully!"); window.location.href="/posts";</script>');
	  	}
	});
});

// Listen on port ----
app.listen(port,()=> {
	console.log(`Server started at http://localhost:${port}`)
});
// Database connection 
client.connect();