<?php

use App\Controllers\ConductoresController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function (App $app) {

    // Ruta de prueba / salud del microservicio
    $app->get('/', function (Request $request, Response $response) {
        $response->getBody()->write(json_encode([
            'servicio' => 'ms-conductores',
            'status'   => 'ok',
        ], JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    });

    // CRUD de conductores
    $app->group('/conductores', function (RouteCollectorProxy $group) {
        $group->get('',         [ConductoresController::class, 'index']);
        $group->post('',        [ConductoresController::class, 'store']);
        $group->get('/{id}',    [ConductoresController::class, 'show']);
        $group->put('/{id}',    [ConductoresController::class, 'update']);
        $group->delete('/{id}', [ConductoresController::class, 'destroy']);
    });

    // Responder cualquier peticion preflight OPTIONS
    $app->options('/{routes:.+}', function (Request $request, Response $response) {
        return $response;
    });
};
