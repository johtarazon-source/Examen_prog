<?php

use App\Controllers\ViajesController;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

return function (App $app) {

    // Ruta de prueba / salud del microservicio
    $app->get('/', function (Request $request, Response $response) {
        $response->getBody()->write(json_encode([
            'servicio' => 'ms-viajes',
            'status'   => 'ok',
        ], JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    });

    // Gestion y seguimiento de viajes
    $app->group('/viajes', function (RouteCollectorProxy $group) {
        // Programacion de viajes (8.4.2)
        $group->get('',                  [ViajesController::class, 'index']);
        $group->post('',                 [ViajesController::class, 'store']);
        $group->get('/{id}',             [ViajesController::class, 'show']);
        $group->put('/{id}',             [ViajesController::class, 'update']);
        $group->put('/{id}/cancelar',    [ViajesController::class, 'cancelar']);

        // Seguimiento operativo (8.5.1)
        $group->get('/{id}/seguimiento', [ViajesController::class, 'seguimiento']);
        $group->put('/{id}/iniciar',     [ViajesController::class, 'iniciar']);
        $group->put('/{id}/estado',      [ViajesController::class, 'actualizarEstado']);
        $group->post('/{id}/novedad',    [ViajesController::class, 'registrarNovedad']);
        $group->put('/{id}/finalizar',   [ViajesController::class, 'finalizar']);
    });

    // Responder cualquier peticion preflight OPTIONS
    $app->options('/{routes:.+}', function (Request $request, Response $response) {
        return $response;
    });
};
