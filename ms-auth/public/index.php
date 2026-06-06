<?php

use App\Middleware\CorsMiddleware;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

// Inicializar conexion Eloquent (lee .env y arranca el ORM)
require __DIR__ . '/../app/Config/database.php';

$app = AppFactory::create();

// Parseo automatico de body JSON / form
$app->addBodyParsingMiddleware();

// CORS (debe ir antes del routing para cubrir el preflight)
$app->add(new CorsMiddleware());

$app->addRoutingMiddleware();

// Manejo de errores -> respuestas JSON
$errorMiddleware = $app->addErrorMiddleware(true, true, true);

// Cargar las rutas de la API
$routes = require __DIR__ . '/../app/Routes/api.php';
$routes($app);

$app->run();
