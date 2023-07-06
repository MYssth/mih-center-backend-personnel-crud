require('dotenv').config();
var config = require('./dbconfig');
const sql = require('mssql');
const bcrypt = require('bcrypt');

async function isPersonnelIdExist(personnel_id) {
    let pool = await sql.connect(config);
    const result = await pool.request().input('personnel_id', sql.VarChar, personnel_id).query("SELECT COUNT(personnel_id) as counter FROM personnel WHERE personnel_id = @personnel_id");
    return result.recordset[0].counter;
}

async function isSignatureExist(personnel_id) {
    let pool = await sql.connect(config);
    const result = await pool.request().input('personnel_id', sql.VarChar, personnel_id).query("SELECT COUNT(personnel_id) as counter FROM personnel_signature WHERE personnel_id = @personnel_id");
    return result.recordset[0].counter;
}

async function addPersonnelLevel(personnel_id, level_id, view_id) {
    let pool = await sql.connect(config);
    var queryText = "INSERT INTO personnel_level_list (personnel_id, level_id, view_id) VALUES ";
    for (let i = 0; i < level_id.length; i++) {
        queryText += "('" + personnel_id + "', '" + level_id[i] + "', '" + view_id[i] + "') ";
        if (i < level_id.length - 1) {
            queryText += ",";
        }
    }
    await pool.request().query(queryText);
}

async function deletePersonnelLevel(personnel_id) {
    let pool = await sql.connect(config);
    await pool.request().input('personnel_id', sql.VarChar, personnel_id).query("DELETE FROM personnel_level_list WHERE personnel_id = @personnel_id")
}

async function getPositionsData() {
    console.log("let getPositionsData");
    const result = await fetch(`http://${process.env.prodHost}:${process.env.psnDataDistPort}/api/getpositions`)
        .then((response) => response.json())
        .then((data) => {
            console.log("getPositionsData complete");
            return data;
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    return result;
}

async function addPersonnel(personnel) {
    try {

        console.log("addPersonnel call try to connect server id = " + personnel.personnel_id);
        let pool = await sql.connect(config);
        console.log("connect complete");
        console.log("check is personnel_id duplicate?");
        let dupCheck = await isPersonnelIdExist(personnel.personnel_id);
        if (dupCheck === 1) {
            console.log("personnel_id is duplicate return status = duplicate to client");
            console.log("====================");
            return { "status": "duplicate" };
        }

        const hash_secret = await bcrypt.hash(personnel.personnel_secret, parseInt(process.env.saltRounds));
        console.log("secret = " + personnel.personnel_secret);
        console.log("hash = " + hash_secret);
        console.log("add new personnel id = " + personnel.personnel_id);
        await pool.request()
            .input('personnel_id', sql.VarChar, personnel.personnel_id)
            .input('personnel_secret', sql.VarChar, hash_secret)
            .input('personnel_firstname', sql.VarChar, personnel.personnel_firstname)
            .input('personnel_lastname', sql.VarChar, personnel.personnel_lastname)
            .input('personnel_isactive', sql.Int, 1)
            .input('position_id', sql.Int, personnel.position_id)
            .query("INSERT INTO personnel (personnel_id, personnel_secret, personnel_firstname, personnel_lastname, personnel_isactive, position_id)" +
                "VALUES (@personnel_id, @personnel_secret, @personnel_firstname, @personnel_lastname, @personnel_isactive, @position_id)");
        console.log("add personnel complete");
        if (personnel.level_list.length > 0) {
            console.log("add new level to level list");
            addPersonnelLevel(personnel.personnel_id, personnel.level_list, personnel.view_list);
            console.log("add level complete");
        }
        if (personnel.signature_data !== null || personnel.signature_data !== "" || personnel.signature_data !== undefined) {
            console.log("signature detect, adding signature");
            await addSignature(personnel);
        }
        console.log("add complete");
        console.log("====================");
        return { "status": "ok" };

    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function updatePersonnel(personnel) {
    try {

        console.log("updatepersonnel call try to connect server id = " + personnel.personnel_id);
        let pool = await sql.connect(config);
        console.log("connect complete");
        let hash_secret = personnel.personnel_secret;
        if (personnel.personnel_secret.length < 30) {
            console.log("hashing password");
            hash_secret = await bcrypt.hash(personnel.personnel_secret, parseInt(process.env.saltRounds));
        }
        console.log("secret = " + personnel.personnel_secret);
        console.log("hash = " + hash_secret);
        console.log("update personnel id = " + personnel.personnel_id);
        await pool.request()
            .input('personnel_id', sql.VarChar, personnel.personnel_id)
            .input('personnel_secret', sql.VarChar, hash_secret)
            .input('personnel_firstname', sql.VarChar, personnel.personnel_firstname)
            .input('personnel_lastname', sql.VarChar, personnel.personnel_lastname)
            .input('personnel_isactive', sql.Int, personnel.personnel_isactive)
            .input('position_id', sql.Int, personnel.position_id)
            .query("UPDATE personnel SET personnel_secret = @personnel_secret, " +
                "personnel_firstname = @personnel_firstname, " +
                "personnel_lastname = @personnel_lastname, " +
                "personnel_isactive = @personnel_isactive, " +
                "position_id = @position_id " +
                "WHERE personnel_id = @personnel_id");
        console.log("update personnel complete");
        if (personnel.level_list !== "" && personnel.level_list !== null && personnel.level_list !== undefined) {
            console.log("update level to level list");
            deletePersonnelLevel(personnel.personnel_id);
            addPersonnelLevel(personnel.personnel_id, personnel.level_list, personnel.view_list);
            console.log("update level complete");
        }
        if (personnel.signature_data !== null && personnel.signature_data !== "" && personnel.signature_data !== undefined) {
            console.log("signature detect, adding signature");
            await addSignature(personnel);
        }
        console.log("update complete");
        console.log("====================");
        return { "status": "ok" };
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function deletePersonnel(personnel_id) {
    try {

        console.log("deletePersonnel call try to connect server id = " + personnel_id);
        let pool = await sql.connect(config);
        console.log("connect complete");
        await pool.request().input('personnel_id', sql.VarChar, personnel_id).query("DELETE FROM personnel WHERE personnel_id = @personnel_id");
        deletePersonnelLevel(personnel_id);
        delSignature(personnel_id);
        console.log("delete complete");
        console.log("====================");
        return { "status": "ok" };

    }
    catch (eror) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function setPersonnelActivate(personnel) {
    try {

        console.log("setPersonnelActivate call try to connect server id = " + personnel.personnel_id + " status = " + personnel.personnel_isactive);
        let pool = await sql.connect(config);
        console.log("connect complete");

        if (personnel.personnel_isactive == 1) {
            console.log("personnel_id: " + personnel.personnel_id + " status request set to active");
            console.log("check is position active?");
            const positionsData = await getPositionsData();
            for (let i = 0; i < positionsData.length; i++) {
                if (positionsData[i].position_id == personnel.position_id) {
                    if (positionsData[i].position_isactive == 0) {
                        console.log("postion deactive detect, cannot active personnel id: " + personnel.personnel_id);
                        console.log("update complete");
                        console.log("====================");
                        return { "status": "refuse", "message": "ไม่สามารถ active ได้เนื่องจากตำแหน่ง deactive อยู่" };
                    }
                    else {
                        console.log("position active detect");
                        break;
                    }
                }
            }
        }

        await pool.request().input('personnel_id', sql.VarChar, personnel.personnel_id)
            .input('personnel_isactive', sql.Int, personnel.personnel_isactive)
            .query("UPDATE personnel SET personnel_isactive = @personnel_isactive WHERE personnel_id = @personnel_id");
        console.log("update complete");
        console.log("====================");
        return { "status": "ok" }

    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function addSignature(personnel) {
    try {
        console.log("addSignature call try connect to server, personnel_id = " + personnel.personnel_id);
        let pool = await sql.connect(config);
        console.log("connect complete");
        console.log("check is signature exist for personnel_id = " + personnel.personnel_id);
        let dupCheck = await isSignatureExist(personnel.personnel_id);
        if (dupCheck > 0) {
            console.log("signature found, delete old signature to keep new signature");
            await delSignature(personnel.personnel_id);
        }
        console.log("signature check done, add new signature");
        await pool.request().input("personnel_id", sql.VarChar, personnel.personnel_id)
            .input("signature_data", sql.VarBinary, Buffer.from(personnel.signature_data))
            .query("INSERT INTO personnel_signature (personnel_id, signature_data) VALUES (@personnel_id, @signature_data)");
        console.log("addSignature complete");
        console.log("====================");
        return { "status": "ok" }
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

async function delSignature(personnel_id) {
    try {
        console.log("delSignature call try connect to server");
        let pool = await sql.connect(config);
        console.log("connect complete");
        await pool.request().input("personnel_id", sql.VarChar, personnel_id)
            .query("DELETE FROM personnel_signature WHERE personnel_id = @personnel_id");
        console.log("delSignature complete");
        console.log("====================");
        return { "status": "ok" }
    }
    catch (error) {
        console.error(error);
        return { "status": "error", "message": error.message };
    }
}

// async function addLvToAll() {
//     try {
//         let pool = await sql.connect(config);
//         const qry = await pool.request().query("SELECT personnel_id FROM personnel WHERE personnel_isactive = 1");
//         const result = qry.recordsets[0];
//         for (let i = 0; i < result.length; i += 1) {
//             console.log(`${i}. add ${result[i].personnel_id}`)
//             addPersonnelLevel(result[i].personnel_id, ["CBS_USER"], []);
//         }
//         return { "status": "ok" }
//     }
//     catch (error) {
//         console.error(error);
//         return { "status": "error", "message": error.message };
//     }
// }

module.exports = {
    addPersonnel: addPersonnel,
    updatePersonnel: updatePersonnel,
    deletePersonnel: deletePersonnel,
    setPersonnelActivate: setPersonnelActivate,
    addSignature: addSignature,
    delSignature: delSignature,
    // addLvToAll: addLvToAll,
}