<?php

namespace App\Controllers;

use App\Models\Programacion;
use App\Models\Seguimiento;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ViajesController
{
    /**
     * Listar viajes (programaciones). Filtros opcionales:
     * ?estado=  ?conductor=  ?vehiculo=  ?fecha=
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $query = Programacion::query();

        if (!empty($params['estado'])) {
            $query->where('estado', $params['estado']);
        }
        if (!empty($params['conductor'])) {
            $query->where('conductor_id', $params['conductor']);
        }
        if (!empty($params['vehiculo'])) {
            $query->where('vehiculo_id', $params['vehiculo']);
        }
        if (!empty($params['fecha'])) {
            $query->where('fecha_salida', $params['fecha']);
        }

        $viajes = $query->orderBy('id', 'desc')->get();

        return $this->json($response, [
            'success' => true,
            'data'    => $viajes,
        ]);
    }

    /**
     * Iniciar un viaje programado (8.5.1).
     * Validaciones: el viaje debe existir y no estar cancelado/finalizado.
     */
    public function iniciar(Request $request, Response $response, array $args): Response
    {
        $viaje = Programacion::find($args['id']);
        if (!$viaje) {
            return $this->json($response, ['success' => false, 'message' => 'No existe la programacion del viaje'], 404);
        }

        if ($viaje->estado === 'cancelado') {
            return $this->json($response, ['success' => false, 'message' => 'No se puede iniciar un viaje cancelado'], 409);
        }
        if (in_array($viaje->estado, ['en_transito', 'retrasado', 'finalizado'], true)) {
            return $this->json($response, ['success' => false, 'message' => 'El viaje ya fue iniciado o finalizado'], 409);
        }

        $viaje->estado = 'en_transito';
        $viaje->save();

        $this->registrarSeguimiento($viaje->id, 'en_transito', 'Viaje iniciado');

        return $this->json($response, [
            'success' => true,
            'message' => 'Viaje iniciado correctamente',
            'data'    => $viaje,
        ]);
    }

    /**
     * Actualizar el estado del viaje (8.5.1).
     * Recibe { estado, novedad? }.
     */
    public function actualizarEstado(Request $request, Response $response, array $args): Response
    {
        $viaje = Programacion::find($args['id']);
        if (!$viaje) {
            return $this->json($response, ['success' => false, 'message' => 'No existe la programacion del viaje'], 404);
        }

        $data = (array) $request->getParsedBody();
        $estado = $data['estado'] ?? '';

        if (!in_array($estado, Programacion::ESTADOS, true)) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Estado no valido. Debe ser: ' . implode(', ', Programacion::ESTADOS),
            ], 400);
        }

        $viaje->estado = $estado;
        $viaje->save();

        $this->registrarSeguimiento($viaje->id, $estado, $data['novedad'] ?? "Estado actualizado a $estado");

        return $this->json($response, [
            'success' => true,
            'message' => 'Estado del viaje actualizado',
            'data'    => $viaje,
        ]);
    }

    /**
     * Registrar una novedad del viaje (8.5.1): retrasos, incidentes, etc.
     * Recibe { novedad, estado? }.
     */
    public function registrarNovedad(Request $request, Response $response, array $args): Response
    {
        $viaje = Programacion::find($args['id']);
        if (!$viaje) {
            return $this->json($response, ['success' => false, 'message' => 'No existe la programacion del viaje'], 404);
        }

        $data = (array) $request->getParsedBody();
        $novedad = trim($data['novedad'] ?? '');

        if ($novedad === '') {
            return $this->json($response, ['success' => false, 'message' => 'La novedad es obligatoria'], 400);
        }

        // El estado de la novedad: el enviado (si es valido) o el actual del viaje
        $estado = $data['estado'] ?? $viaje->estado;
        if (!in_array($estado, Programacion::ESTADOS, true)) {
            $estado = $viaje->estado;
        }

        // Si se envia un estado distinto, tambien se actualiza el viaje
        if ($estado !== $viaje->estado) {
            $viaje->estado = $estado;
            $viaje->save();
        }

        $seguimiento = $this->registrarSeguimiento($viaje->id, $estado, $novedad);

        return $this->json($response, [
            'success' => true,
            'message' => 'Novedad registrada',
            'data'    => $seguimiento,
        ], 201);
    }

    /**
     * Finalizar un viaje (8.5.1).
     * Validacion: no se puede finalizar un viaje no iniciado o ya cancelado.
     */
    public function finalizar(Request $request, Response $response, array $args): Response
    {
        $viaje = Programacion::find($args['id']);
        if (!$viaje) {
            return $this->json($response, ['success' => false, 'message' => 'No existe la programacion del viaje'], 404);
        }

        if ($viaje->estado === 'cancelado') {
            return $this->json($response, ['success' => false, 'message' => 'No se puede finalizar un viaje cancelado'], 409);
        }
        if (!in_array($viaje->estado, ['en_transito', 'retrasado'], true)) {
            return $this->json($response, ['success' => false, 'message' => 'No se puede finalizar un viaje que no ha sido iniciado'], 409);
        }

        $viaje->estado = 'finalizado';
        $viaje->save();

        $this->registrarSeguimiento($viaje->id, 'finalizado', 'Viaje finalizado');

        return $this->json($response, [
            'success' => true,
            'message' => 'Viaje finalizado correctamente',
            'data'    => $viaje,
        ]);
    }

    /**
     * Consultar el seguimiento de un viaje (8.5.1):
     * historial de novedades y estados.
     */
    public function seguimiento(Request $request, Response $response, array $args): Response
    {
        $viaje = Programacion::find($args['id']);
        if (!$viaje) {
            return $this->json($response, ['success' => false, 'message' => 'No existe la programacion del viaje'], 404);
        }

        $historial = Seguimiento::where('programacion_viaje_id', $viaje->id)
            ->orderBy('id', 'asc')
            ->get();

        return $this->json($response, [
            'success' => true,
            'data'    => [
                'viaje'     => $viaje,
                'historial' => $historial,
            ],
        ]);
    }

    /**
     * Crea un registro de seguimiento con la fecha y hora actuales.
     */
    private function registrarSeguimiento(int $programacionId, string $estado, string $novedad): Seguimiento
    {
        return Seguimiento::create([
            'programacion_viaje_id' => $programacionId,
            'fecha'   => date('Y-m-d'),
            'hora'    => date('H:i:s'),
            'estado'  => $estado,
            'novedad' => $novedad,
        ]);
    }

    private function json(Response $response, array $payload, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
