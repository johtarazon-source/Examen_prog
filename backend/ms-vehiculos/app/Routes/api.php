<?php

use App\Controllers\VehiculosController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function (App $app) {

    // Ruta de prueba / salud del microservicio
    $app->get('/', function (Request $request, Response $response) {
        $response->getBody()->write(json_encode([
            'servicio' => 'ms-vehiculos',
            'status'   => 'ok',
        ], JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    });

    // CRUD de vehiculos
    $app->group('/vehiculos', function (RouteCollectorProxy $group) {
        $group->get('',         [VehiculosController::class, 'index']);
        $group->post('',        [VehiculosController::class, 'store']);
        $group->get('/{id}',    [VehiculosController::class, 'show']);
        $group->put('/{id}',    [VehiculosController::class, 'update']);
        $group->delete('/{id}', [VehiculosController::class, 'destroy']);
    });

    // Responder cualquier peticion preflight OPTIONS
    $app->options('/{routes:.+}', function (Request $request, Response $response) {
        return $response;
    });
};
