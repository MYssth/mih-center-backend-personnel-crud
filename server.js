const dboperations = require('./dboperations');

var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const { request, response } = require('express');
var app = express();
var router = express.Router();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({
    origin: '*'
}));
app.use('/api', router);

router.use((request, response, next) => {
    //write authen here

    response.setHeader('Access-Control-Allow-Origin', '*'); //หรือใส่แค่เฉพาะ domain ที่ต้องการได้
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Credentials', true);

    console.log('middleware');
    next();
});

router.route('/addpersonnel').post((request, response) => {

    let personnel = { ...request.body };

    dboperations.addPersonnel(personnel).then(result => {
        response.status(201).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

router.route('/updatepersonnel').post((request, response) => {

    let personnel = { ...request.body };

    dboperations.updatePersonnel(personnel).then(result => {
        response.status(200).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

router.route('/deletepersonnel/:id').post((request, response) => {

    dboperations.deletePersonnel(request.params.id).then(result => {
        response.status(200).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

router.route('/setpersonnelactivate/:id/:isactive').post((request, response) => {

    dboperations.setPersonnelActivate(request.params.id, request.params.isactive).then(result => {
        response.status(200).json(result);
    }).catch(err => {
        console.error(err);
        response.sendStatus(500);
    });

});

var port = process.env.PORT;
app.listen(port);
console.log('user-crud API is running at ' + port);