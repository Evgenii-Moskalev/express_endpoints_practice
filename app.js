const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME
});


// app.use(async function (req, res, next) { res.json("pool is ready")})


app.use(async function (req, res, next) {
    try {
        req.db = await pool.getConnection();
        req.db.connection.config.namedPlaceholders = true;

        await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
        await req.db.query(`SET time_zone = '-8:00'`);

        await next();

        req.db.release();
    } catch (err) {
        console.log(err);

        if (req.db) req.db.release();
        throw err;
    }
});

// app.use(async function (req, res, next) { res.json("db is connected")})

app.use(cors());

app.use(express.json());

app.get('/cars', async function (req, res) {
    try {
        // console.log('get/cars')
        const [allCars] = await req.db.query(
            // `SELECT * from express_endpoint_practice.car`
            `
        SELECT * FROM car WHERE deleted_flag = '0';
        `);
        res.json({ allCars })
    } catch (err) {
        console.log(err)
        res.json({ err });
    }
});

app.use(async function (req, res, next) {
    try {
        // console.log('Middleware after the get /cars');

        await next();

    } catch (err) {
        console.log(err)
        res.json({ err });
    }
});

app.post('/car', async function (req, res) {
    try {
        const { make, model, year } = req.body;

        const query = await req.db.query(
            `INSERT INTO car (make, model, year) 
       VALUES (:make, :model, :year)`,
            {
                make,
                model,
                year,
            }
        );
        console.log(query);
        res.json({ success: true, message: 'Car successfully created', data: null });
    } catch (err) {
        res.json({ success: false, message: err, data: null })
    }
});

app.put('/car/:id', async function (req, res) {
    try {
        const id = parseInt(req.params.id);
        const [allCars] = await req.db.query(`
        SELECT * FROM car;
        `)


        const found = allCars.some(car => car.id === id);

        if (found) {
            const { make: updMake, model: updModel, year: updYear } = req.body;

            // console.log(typeof (make));
            // const query = req.db.query(`
            // UPDATE car
            // SET make = '${make}', model = '${model}', year = ${year}
            // WHERE id = ${id} 
            // `);
            try {
                const query = await req.db.query(`
                    UPDATE car
                    SET make = :make, model = :model, year = :year, deleted_flag = '0'
                    WHERE id = :id
            `, {
                    make: updMake,
                    model: updModel,
                    year: updYear,
                    id: id
                });

                res.json({ msg: `Car with id ${id} was updated`, info: `${query[0].info}` });

            } catch (error) {
                res.json(error.message)
            }

        } else {
            res.status(400).json({ msg: `Car with the id of ${req.params.id} is not exist in Car DB` })
        }
    } catch (err) {
        res.json(err)
    }
});

app.delete('/car/:id', async function (req, res) {
    try {
        // console.log('req.params /car/:id', req.params)

        const id = parseInt(req.params.id);
        const [allCars] = await req.db.query(`
        SELECT * FROM car;
        `);

        const found = allCars.some(car => car.id === id);
        if (found) {
            try {
                // console.log(id);
                // const query = await req.db.query(`
                // DELETE FROM car
                // WHERE id = ${id};
                // `)

                const query = await req.db.query(`
                    UPDATE car
                    SET deleted_flag = '1'
                    WHERE id = ${id}
                 `);

                res.json(`Car was flagged as deleted, deleted_flag of row with id:${id} now is = 1`)
            } catch (error) {
                res.json(error.message)
            }
        } else {
            res.status(400).json({ msg: `Car with the id of ${req.params.id} is not exist in Car DB` })
        }

    } catch (err) {
        console.log(err)
        res.json({ err });
    }
});

app.listen(port, () => console.log(`212 API Example listening on http://localhost:${port}`));