const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const mongoURI = process.env.MONGO_URI;
const bodyParser = require('body-parser');

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: {type: String, required: true}
});

const exerciseSchema = new mongoose.Schema({
  userId: {type: mongoose.ObjectId, required: true},
  username: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, required: false}
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({extended: false}));


// Create user
app.post('/api/users', function(req, res) {

    let username = req.body.username;
    let user = new User({
      username: username
    });

    user.save(function(error, data) {
      if(error)
      {
        res.statusCode = 500; 
        res.json({ 'Error': error.message });
      }

      res.json({
        "_id": data._id,
        "username": data.username
      });
    });
    
});


// Retrieve all users
app.get('/api/users', function(req, res) {
  User.find({}, function(error, data) {
    if(error)
    {
      res.status = 400;
      res.json({"Error": error});
    }

    res.json(data);
  });
});


  // Create exercise
  app.post('/api/users/:_id/exercises', function(req, res) {
      let id = req.params._id;
      let description = req.body.description;
      let duration = req.body.duration;
      let date = new Date().toDateString();

      if(req.body.date !== "")
      {
        date = new Date(req.body.date).toDateString();

        if(date == 'Invalid Date')
        {
          res.status = 400;
          res.json({
            'Error': 'Invalid date'
          });
        }
      }
      
      if(isNaN(duration))
      {
          res.status = 400;
          res.json({
            'Error': 'Duration should be number'
          });
      }
      
      User.findById(id, function(error, userData) {
        if(error)
        {
          res.status = 400;
          res.json({
            'Error (User.findById)': error
          });
        }
        
        if(userData != null)
        {
          let exercise = new Exercise({
            userId: userData['_id'],
            username: userData['username'],
            description: description,
            duration: duration,
            date: date
          });

          exercise.save(function(error, exerciseData) {
            if(error)
            {
              res.status = 400;
              res.json({
                'Error (exercise.save)': error
              });
            }

            res.json({
              _id: userData['_id'],
              username: userData['username'],
              date: new Date(exerciseData['date']).toDateString(),
              duration: exerciseData['duration'],
              description: exerciseData['description']
            });
          });
        }
        else
        {
          res.status = 400;
          res.json({
            'Error': 'Cannot find user'
          });
        }
      });
});


// Retrieve logs
app.get('/api/users/:_id/logs', function(req, res) {
  let id = req.params._id;;
  let from = "";
  let to = "";
  let limit = 0;

  if(req.query.from)
  {
    from = new Date(req.query.from).toDateString();

    if(from == 'Invalid Date')
    {
      res.status = 400;
      res.json({
        'Error': 'Invalid date'
      });
    }
  }

  if(req.query.to)
  {
    to = new Date(req.query.to).toDateString();

    if(to == 'Invalid Date')
    {
      res.status = 400;
      res.json({
        'Error': 'Invalid date'
      });
    }
  }

  if(req.query.limit)
  {
    if(isNaN(req.query.limit))
    {
      res.status = 400;
      res.json({
        'Error': 'Limit should be number'
      });
    }

    limit = Number(req.query.limit);
  }

  User.findById(id, function(error, userData) {
    if(error)
    {
      res.status = 400;
      res.json({'Error(User.findById)': error});
    }

    if(userData != null)
    {
      let exercise = Exercise.find({userId: userData["_id"]})
        .select({
          description: 1,
          duration: 1,
          date: 1,
          _id: 0
        });

      if(from != "")
      {
        exercise.where('date').gte(from);
      }

      if(to != "")
      {
        exercise.where('date').lte(to);
      }

      if(limit != 0)
      {
        exercise.limit(limit);
      }

      exercise.exec(function(error, exerciseData) {
        if(error)
        {
          res.status = 400;
          res.json({
            'Error (exercise.exec)': error
          });
        }

        let formattedLog = [];

        if(exerciseData != null)
        {
          // Format the 'date' for each exercise
          formattedLog = exerciseData.map(exercise => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
          }));
        }

        let exerciseCount = formattedLog.length;

        res.json({
          '_id': userData["_id"],
          'username': userData['username'],
          'count': exerciseCount,
          'log': formattedLog
        });

      });

    }
    else
    {
      res.status = 400;
      res.json({
        'Error': 'Cannot find user'
      });
    }

  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
