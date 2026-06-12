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
     * Obtener una programacion por id.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $viaje = Programacion::find($args['id']);
        if (!$viaje) {
            return $this->json($response, ['success' => false, 'message' => 'No existe la programacion del viaje'], 404);
        }
        return $this->json($response, ['success' => true, 'data' => $viaje]);
    }

    /**
     * Programar un viaje (8.4.2).
     * Asigna conductor, vehiculo, ruta y fechas. La disponibilidad de
     * conductor/vehiculo la filtra el frontend; aqui se validan los
     * campos, la coherencia de fechas y que no haya un viaje activo
     * con el mismo conductor o vehiculo.
     */
    public function store(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();

        $error = $this->validarProgramacion($data);
        if ($error !== null) {
            return $this->json($response, ['success' => false, 'message' => $error], 400);
        }

        // No permitir doble asignacion del conductor en viajes activos
        $conflicto = $this->conductorOVehiculoOcupado($data['conductor_id'], $data['vehiculo_id']);
        if ($conflicto !== null) {
            return $this->json($response, ['success' => false, 'message' => $conflicto], 409);
        }

        $viaje = Programacion::create([
            'conductor_id'           => $data['conductor_id'],
            'vehiculo_id'            => $data['vehiculo_id'],
            'ruta_id'                => $data['ruta_id'],
            'fecha_salida'           => $data['fecha_salida'],
            'hora_salida'            => $data['hora_salida'],
            'fecha_estimada_llegada' => $data['fecha_estimada_llegada'],
            'observaciones'          => $data['observaciones'] ?? null,
            'estado'                 => 'programado',
        ]);

        $this->registrarSeguimiento($viaje->id, 'programado', 'Viaje programado');

        return $this->json($response, [
            'success' => true,
            'message' => 'Viaje programado correctamente',
            'data'    => $viaje,
        ], 201);
    }

    /**
     * Reprogramar un viaje (8.4.2): modificar fechas, conductor,
     * vehiculo u observaciones. Solo si el viaje sigue 'programado'.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $viaje = Programacion::find($args['id']);
        if (!$viaje) {
            return $this->json($response, ['success' => false, 'message' => 'No existe la programacion del viaje'], 404);
        }

        if ($viaje->estado !== 'programado') {
            return $this->json($response, [
                'success' => false,
                'message' => 'Solo se pueden reprogramar viajes en estado programado',
            ], 409);
        }

        $data = (array) $request->getParsedBody();

        $error = $this->validarProgramacion($data);
        if ($error !== null) {
            return $this->json($response, ['success' => false, 'message' => $error], 400);
        }

        // Conflicto de disponibilidad, excluyendo el propio viaje
        $conflicto = $this->conductorOVehiculoOcupado($data['conductor_id'], $data['vehiculo_id'], $viaje->id);
        if ($conflicto !== null) {
            return $this->json($response, ['success' => false, 'message' => $conflicto], 409);
        }

        $viaje->update([
            'conductor_id'           => $data['conductor_id'],
            'vehiculo_id'            => $data['vehiculo_id'],
            'ruta_id'                => $data['ruta_id'],
            'fecha_salida'           => $data['fecha_salida'],
            'hora_salida'            => $data['hora_salida'],
            'fecha_estimada_llegada' => $data['fecha_estimada_llegada'],
            'observaciones'          => $data['observaciones'] ?? null,
        ]);

        $this->registrarSeguimiento($viaje->id, 'programado', 'Viaje reprogramado');

        return $this->json($response, [
            'success' => true,
            'message' => 'Viaje reprogramado correctamente',
            'data'    => $viaje,
        ]);
    }

    /**
     * Cancelar una programacion de viaje. No se puede cancelar un
     * viaje ya finalizado.
     */
    public function cancelar(Request $request, Response $response, array $args): Response
    {
        $viaje = Programacion::find($args['id']);
        if (!$viaje) {
            return $this->json($response, ['success' => false, 'message' => 'No existe la programacion del viaje'], 404);
        }

        if ($viaje->estado === 'finalizado') {
            return $this->json($response, ['success' => false, 'message' => 'No se puede cancelar un viaje finalizado'], 409);
        }
        if ($viaje->estado === 'cancelado') {
            return $this->json($response, ['success' => false, 'message' => 'El viaje ya esta cancelado'], 409);
        }

        $viaje->estado = 'cancelado';
        $viaje->save();

        $this->registrarSeguimiento($viaje->id, 'cancelado', 'Viaje cancelado');

        return $this->json($response, [
            'success' => true,
            'message' => 'Viaje cancelado correctamente',
            'data'    => $viaje,
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
     * Valida los campos de una programacion de viaje.
     * Retorna el primer mensaje de error o null si es valida.
     */
    private function validarProgramacion(array $data): ?string
    {
        $requeridos = [
            'conductor_id', 'vehiculo_id', 'ruta_id',
            'fecha_salida', 'hora_salida', 'fecha_estimada_llegada',
        ];
        foreach ($requeridos as $campo) {
            if (!isset($data[$campo]) || $data[$campo] === '' || $data[$campo] === null) {
                return "El campo '$campo' es obligatorio";
            }
        }

        // IDs deben ser numericos positivos
        foreach (['conductor_id', 'vehiculo_id', 'ruta_id'] as $idCampo) {
            if (!ctype_digit((string) $data[$idCampo]) || (int) $data[$idCampo] <= 0) {
                return "El campo '$idCampo' debe ser un identificador valido";
            }
        }

        // La fecha de llegada no puede ser anterior a la de salida
        if (strtotime($data['fecha_estimada_llegada']) < strtotime($data['fecha_salida'])) {
            return 'La fecha estimada de llegada no puede ser anterior a la fecha de salida';
        }

        return null;
    }

    /**
     * Verifica si el conductor o el vehiculo ya estan asignados a otro
     * viaje activo (programado, en transito o retrasado).
     * Retorna el mensaje de conflicto o null.
     */
    private function conductorOVehiculoOcupado($conductorId, $vehiculoId, ?int $excluirId = null): ?string
    {
        $activos = ['programado', 'en_transito', 'retrasado'];

        $conductorOcupado = Programacion::where('conductor_id', $conductorId)
            ->whereIn('estado', $activos)
            ->when($excluirId, fn ($q) => $q->where('id', '!=', $excluirId))
            ->exists();
        if ($conductorOcupado) {
            return 'El conductor ya tiene un viaje activo asignado';
        }

        $vehiculoOcupado = Programacion::where('vehiculo_id', $vehiculoId)
            ->whereIn('estado', $activos)
            ->when($excluirId, fn ($q) => $q->where('id', '!=', $excluirId))
            ->exists();
        if ($vehiculoOcupado) {
            return 'El vehiculo ya tiene un viaje activo asignado';
        }

        return null;
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
