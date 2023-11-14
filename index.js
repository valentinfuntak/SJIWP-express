const express = require ("express");    //Importanje express datoteke 

const app = express();                  //Predstavlja nasu aplikcaiju
const port = 8080;                      //Predstavlja port

app.get("/test", (request, response) => {   //Omogučavanje da server pirma zahtjev
        response.send("Server radi!");
});                           

app.listen(port, () => {                //()=> je privatna funkcija
    console.log("Server spreman za rad sa testa!");
});