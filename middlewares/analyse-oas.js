const SwaggerParser = require('@apidevtools/swagger-parser');
const { generateValue } = require('../helpers/generateValues');
const {
  prefixingkey,
  extractPathName,
} = require('../helpers/modifyingKeyNames');

const defaultStyles = {
  query: 'form',
  cookie: 'form',
  path: 'simple',
  header: 'simple',
};

const stylesTemplate = {
  path: {
    simple: ['{p}', '{p*}'],
    label: ['{.p}', '{.p*}'],
    matrix: ['{;p}', '{;p*}'],
  },
  query: {
    form: ['p', 'p*'],
    spaceDelimited: ['%20', 'p*'],
    pipeDelimited: ['|', 'p*'],
  },
  header: {
    simple: ['{p}', '{p*}'],
  },
};

const transformRoute = (route, pathName) => {
  const transformedRoute = {
    inputs: {
      parameters: [],
      requestBody: [],
    },
    outputs: {},
  };

  // input: parameters
  // loop on parameters obj (if exist)
  if (route.parameters) {
    let explode = null;
    route.parameters.forEach((param) => {
      // no explode -> default = false (exception style 'form' default = true)
      explode = param.explode
        ? +param.explode
        : !param.style || param.style === 'form'
        ? +true
        : +false;

      // check to see if param name is not specified exactly ex: id
      // if not use the original name
      // if it use the operationId + param name if exixst <--> if not exist use the path name + param name
      const paramName =
        param.name.toLowerCase() !== 'id'
          ? param.name
          : prefixingkey(route.operationId ? route.operationId : pathName);

      const paramObj = {
        name: param.name,
        paramName: paramName,
        in: param.in,
        required: param.required ? param.required : false,
        style: param.style
          ? stylesTemplate[param.in][param.style][explode]
          : stylesTemplate[param.in][defaultStyles[param.in]][explode],
      };

      // add paramter (schema, value) to the dictionry if not already exist
      if (!dictionary[paramName]) {
        dictionary[paramName] = {
          schema: param.schema,
          value: param.example
            ? param.example
            : generateValue(
                param.schema,
                route.operationId ? route.operationId : pathName
              ),
        };
      }
      transformedRoute['inputs'].parameters.push(paramObj);
    });
  }

  // input: body content
  if (route.requestBody) {
    const bodyContent =
      route.requestBody.content[Object.keys(route.requestBody.content)[0]];

    const bodyObj = {
      schema: bodyContent.schema,
      required: route.requestBody.required ? route.requestBody.required : false,
      example: generateValue(
        bodyContent.schema,
        route.operationId ? route.operationId : pathName
      ),
    };

    transformedRoute['inputs'].requestBody.push(bodyObj);
  }

  // output: responses
  if (route.responses) {
    for (let res in route.responses) {
      transformedRoute.outputs[res] = route.responses[res];
    }
  }

  return transformedRoute;
};

exports.transformRoutes = async (req, res, next) => {
  // const routesMap = {
  //   get: {},
  //   post: {},
  //   put: {},
  //   patch: {},
  //   delete: {},
  // };

  const routesMap = {};

  try {
    const oas = await SwaggerParser.dereference(req.workingFilePath);
    const oasPaths = oas.paths;

    // later: work on file streams (chunks) instead of looping on whole file
    // if big --> split to chunks and work parallel on each chunck
    for (let path in oasPaths) {
      routesMap[path] = {};
      for (let op in oasPaths[path]) {
        routesMap[path][op] = transformRoute(
          oasPaths[path][op],
          extractPathName(path)
        );
      }
    }
    // .post['/meals'].inputs.requestBody[0].content
    // .get['/meals'].inputs.parameters[0].jsonSchema
    //.get['/maps/api/elevation/json'].inputs.parameters
    // ['/meals/{id}']['delete'].inputs.parameters
    // console.log(routesMap['/meals']['get'].inputs.parameters);
    // routesMap['/meals']['get'].outputs
    // routesMap['/meals']['post'].inputs.requestBody
    console.log(dictionary);

    req.routes = routesMap;

    next();
  } catch (err) {
    next(err);
  }
};
