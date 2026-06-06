<?php

use App\Controllers\AuthController;
use Slim\App;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function (App $app) {

    // Ruta de prueba / salud del microservicio
    $app->get('/', function (Request $request, Response $response) {
        $response->getBody()->write(json_encode([
            'servicio' => 'ms-auth',
            'status'   => 'ok',
        ], JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    });

    // Endpoints de autenticacion
    $app->post('/login',    [AuthController::class, 'login']);
    $app->post('/logout',   [AuthController::class, 'logout']);
    $app->get('/validar',   [AuthController::class, 'validar']);

    // Responder cualquier peticion preflight OPTIONS
    $app->options('/{routes:.+}', function (Request $request, Response $response) {
        return $response;
    });
};
