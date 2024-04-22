/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();


const crypto = require("crypto");

var rp = require('request-promise');



const GA_TRACKING_ID = process.env.GA_KEY;

function trackDimension(category, action, label, value, dimension, metric) {

    var options = { method: 'GET',
        url: 'https://www.google-analytics.com/collect',
        qs:
            {   // API Version.
                v: '1',
                // Tracking ID / Property ID.
                tid: GA_TRACKING_ID,
                // Random Client Identifier. Ideally, this should be a UUID that
                // is associated with particular user, device, or browser instance.
                cid: crypto.randomBytes(16).toString("hex"),
                // Event hit type.
                t: 'event',
                // Event category.
                ec: category,
                // Event action.
                ea: action,
                // Event label.
                el: label,
                // Event value.
                ev: value,
                // Custom Dimension
                cd1: dimension,
                // Custom Metric
                cm1: metric
            },
        headers:
            {  'Cache-Control': 'no-cache' } };

    return rp(options);
}


router.route('/test')
    .get(function (req, res) {
        // Event value must be numeric.
        trackDimension('Feedback', 'Rating', 'Feedback for Movie', '3', 'Titanic', '1')
            .then(function (response) {
                console.log(response.body);
                res.status(200).send('Event tracked.').end();
            })
    });


function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

/*
const aggregate = [
    {
      $match: { _id: movieId }
    },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'movieId',
        as: 'movieReviews'
      }
    },
    {
      $addFields: {
        avgRating: { $avg: '$movieReviews.rating' }
      }
    }
  ];
  Movie.aggregate(aggregate).exec(function(err, doc) { if(err){
    // Handle the error
}
else{
    console.log(result);
} });
*/  

// Aggregate function:
/*Review.aggregate([
    {
    $match: { _id: movieId}
    },
    {
        $lookup:{
            from: "movies",
            localField: "movieId",
            foreignField: "_id",
            as: "Reviews for Movie"
        }
    }

]).exec(function(err, result){
    if(err){
        // Handle the error
    }
    else{
        console.log(result);
    }
});
*/

/*
// From class lecture
db.movies.aggregate([
    {
    $lookup:
    {
        from: "reviews",
        localField: "_id",
        foreignField: "movie_id",
        as: "reviews"
    },
    },
{
    $addField:
    {
        avgRating: {$avg: ["reviews.rating"]}
    }
}
])
*/

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});


// Movies Collection
// Updating route to /movies
router.route('/movies')
/*
    .get(authJwtController.isAuthenticated, (req, res) => {
        Movie.find(function(err, movies) {
            if (err) {
                res.status(500).send(err);
            }
            res.json(movies);
        });
    })
    */
/*
    .get(authController.isAuthenticated, (req, res) => {
        let getReviews = req.params.movieId;
        if(req.query.reviews == "true"){
            console.log(movie.title.aggregate)
        }
    })
*/
.get(authJwtController.isAuthenticated, (req, res) => {
    if (req.query && req.query.reviews == "true") {
       Movie.aggregate([

          {
                $lookup: {

                    from: 'reviews',

                    localField: '_id',

                    foreignField: 'movieId',

                    as: 'MovieReviews'
                }
            },

            {

                $addFields: {

                    theReviews: { $TheReview: '$reviews.review' }

                }

            }

        ]).exec(function(err, doc) {

            if (err) {

                res.status(500).send(err);

            }

            // res.json({msg: "Broken!"})

            res.json(doc);
 
        });

    }

    else {

        // res.json({msg: "It worked!"})

        Movie.find(function(err, movies) {

            if (err) {

                res.status(500).send(err);

            }

            res.json(movies);

        });

    }

})
    .post(authJwtController.isAuthenticated, (req, res) => {
        var movie = new Movie()
        movie.title = req.body.title;
        movie.releaseDate = req.body.releaseDate;
        movie.genre = req.body.genre;
        movie.actors = req.body.actors;

        movie.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'Something went wrong when saving the movie.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new movie.'})
        })
    })
    .delete(authJwtController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        o.status = 200;
        o.message = "movie deleted";
        res.json(o);
    }
    )
    .put(authJwtController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        o.status = 200;
        o.message = "movie updated";
        res.json(o);
    }
    )
    .all((req, res) => {
        // Any other HTTP Method
        // Returns a message stating that the HTTP method is unsupported.
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

// Reviews Collection
// Updating route to /reviews
router.route('/reviews')
    .delete(authJwtController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        o.status = 200;
        o.message = "Review deleted";
        res.json(o);
    }
    )
    .get(authJwtController.isAuthenticated, (req, res) => {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        var o = getJSONObjectForMovieRequirement(req);
        o.status = 200;
        o.message = "Review updated!";
        res.json(o);
    }
    )
    .post(authJwtController.isAuthenticated, (req, res) => {
        var newReview = new Review();
        // I have changed this because I couldn't get the actual movie ID without
        // going in the database and manually adding it from there
        // However, if you wish to do it that way, you can uncomment the following
        // line and comment newReview.movieId = req.body.title;
        newReview.movieId = req.body.movieId;
        //newReview.movieId = req.body.title;
        newReview.username = req.body.username;
        newReview.review = req.body.review;
        newReview.rating = req.body.rating;

        newReview.save(function(err){
            if (err) {
                if (!Movie.findById(newReview.movieId))
                    return res.json({ success: false, message: 'INVALID, movie not in database.'});
                //else
                    //return res.json(err);
            }

            res.json({success: true, msg: 'VALID, Successfully created new review.'})
        });
    }
    )

    .all((req, res) => {
        // Any other HTTP Method
        // Returns a message stating that the HTTP method is unsupported.
        res.status(405).send({ message: 'HTTP method not supported.' });
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only
