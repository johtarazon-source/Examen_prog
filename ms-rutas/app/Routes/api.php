<?php

use App\Controllers\RutasController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function (App $app) {

    // Ruta de prueba / salud del microservicio
    $app->get('/', function (Request $request, Response $response) {
        $response->getBody()->write(json_encode([
            'servicio' => 'ms-rutas',
            'status'   => 'ok',
        ], JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    });

    // CRUD de rutas
    $app->group('/rutas', function (RouteCollectorProxy $group) {
        $group->get('',         [RutasController::class, 'index']);
        $group->post('',        [RutasController::class, 'store']);
        $group->get('/{id}',    [RutasController::class, 'show']);
        $group->put('/{id}',    [RutasController::class, 'update']);
        $group->delete('/{id}', [RutasController::class, 'destroy']);
    });

    // Responder cualquier peticion preflight OPTIONS
    $app->options('/{routes:.+}', function (Request $request, Response $response) {
        return $response;
    });
};
