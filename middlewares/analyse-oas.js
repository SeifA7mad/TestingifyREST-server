const fs = require('fs');
const path = require('path');
const axios = require('axios');
const SwaggerParser = require('@apidevtools/swagger-parser');

exports.saveOasToFile = (req, res, next) => {
  const fileName = `${req.body.info.title}`.trim().split(' ').join('');
  const dir = path.join(process.cwd(), `/data/${fileName}.json`);

  try {
    fs.writeFileSync(dir, JSON.stringify(req.body));
    console.log('File SAVED!');
    req.workingFilePath = dir;
    next();
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
};

exports.validateAccessToApi = async (req, res, next) => {
  try {
    const oas = await SwaggerParser.bundle(req.workingFilePath);

    //loop on each server to catch an working one
    // oas.servers.forEach(async (server) => {
    //   try {
    //     const response = await axios(
    //       `${server.url}weather?q=London&appid=53f9205b25dcd994f69d550835e47081`
    //     );
    //     console.log(response.status);
    //   } catch (err) {
    //     console.log(err);
    //   }
    // });
    next();
  } catch (err) {
    console.log(err);
  }
};
