require('dotenv').config();
var config = require('./dbconfig');
const sql = require('mssql');
const bcrypt = require('bcrypt');

async function addRole(personnel_id, role_id) {
    let pool = await sql.connect(config);
    var queryText = "INSERT INTO personnel_role_list (personnel_id, role_id) VALUES ";
    for (let i = 0; i < role_id.length; i++) {
        queryText += "('" + personnel_id + "', '" + role_id[i] + "') ";
        if (i < role_id.length - 1) {
            queryText += ",";
        }
    }
    await pool.request().query(queryText);
}

async function deleteRole(personnel_id) {
    let pool = await sql.connect(config);
    await pool.request().input('personnel_id', sql.VarChar, personnel_id).query("DELETE FROM personnel_role_list WHERE personnel_id = @personnel_id")
}

async function addPersonnel(personnel) {
    try {

        console.log("addPersonnel call try to connect server id = "+personnel.personnel_id);
        let pool = await sql.connect(config);
        console.log("connect complete");

        const hash_secret = await bcrypt.hash(personnel.personnel_secret, parseInt(process.env.saltRounds));
        console.log("secret = " + personnel.personnel_secret);
        console.log("hash = " + hash_secret);
        console.log("add new personnel id = " + personnel.personnel_id);
        await pool.request()
            .input('personnel_id', sql.VarChar, personnel.personnel_id)
            .input('personnel_secret', sql.VarChar, hash_secret)
            .input('personnel_firstname', sql.VarChar, personnel.personnel_firstname)
            .input('personnel_lastname', sql.VarChar, personnel.personnel_lastname)
            .input('personnel_isactive', sql.Bit, 1)
            .input('position_id', sql.Int, personnel.position_id)
            .query("INSERT INTO personnel (personnel_id, personnel_secret, personnel_firstname, personnel_lastname, personnel_isactive, position_id)" +
                "VALUES (@personnel_id, @personnel_secret, @personnel_firstname, @personnel_lastname, @personnel_isactive, @position_id)");
        console.log("add personnel complete");
        console.log("add new role to role list");
        addRole(personnel.personnel_id, personnel.role_id);
        console.log("add role complete");
        console.log("add complete");
        console.log("====================");
        return { status: "ok" };

    }
    catch (error) {
        console.error(error);
    }
}

async function updatePersonnel(personnel) {
    try {

        console.log("updatepersonnel call try to connect server id = "+personnel.personnel_id);
        let pool = await sql.connect(config);
        console.log("connect complete");
        let hash_secret = personnel.personnel_secret;
        if (personnel.personnel_secret.length < 30) {
            console.log("hashing password");
            hash_secret = await bcrypt.hash(personnel.personnel_secret, parseInt(process.env.saltRounds));
        }
        console.log("secret = " + personnel.personnel_secret);
        console.log("hash = " + hash_secret);
        console.log("update personnel id = "+personnel.personnel_id);
        await pool.request()
            .input('personnel_id', sql.VarChar, personnel.personnel_id)
            .input('personnel_secret', sql.VarChar, hash_secret)
            .input('personnel_firstname', sql.VarChar, personnel.personnel_firstname)
            .input('personnel_lastname', sql.VarChar, personnel.personnel_lastname)
            .input('personnel_isactive', sql.Bit, personnel.personnel_isactive)
            .input('position_id', sql.Int, personnel.position_id)
            .query("UPDATE personnel SET personnel_secret = @personnel_secret, " +
                "personnel_firstname = @personnel_firstname, " +
                "personnel_lastname = @personnel_lastname, " +
                "personnel_isactive = @personnel_isactive, " +
                "position_id = @position_id " +
                "WHERE personnel_id = @personnel_id");
        console.log("update personnel complete");
        console.log("update role to role list");
        deleteRole(personnel.personnel_id);
        addRole(personnel.personnel_id,personnel.role_id);
        console.log("update role complete");
        console.log("update complete");
        console.log("====================");
        return { status: "ok" };
    }
    catch (err) {
        console.error(err);
    }
}

async function deletePersonnel(personnel_id) {
    try {

        console.log("deletePersonnel call try to connect server id = " + personnel_id);
        let pool = await sql.connect(config);
        console.log("connect complete");
        await pool.request().input('personnel_id', sql.VarChar, personnel_id).query("DELETE FROM personnel WHERE personnel_id = @personnel_id");
        deleteRole(personnel_id);
        console.log("delete complete");
        return { status: "ok" };

    }
    catch (err) {

    }
}

module.exports = {
    addPersonnel: addPersonnel,
    updatePersonnel: updatePersonnel,
    deletePersonnel: deletePersonnel,
}