<?php

namespace App\Controllers;

use App\Models\Vehiculo;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class VehiculosController
{
    /**
     * Listar vehiculos. Soporta filtros opcionales por query string:
     * ?estado=  ?tipo=  ?placa=
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $query = Vehiculo::query();

        if (!empty($params['estado'])) {
            $query->where('estado', $params['estado']);
        }
        if (!empty($params['tipo'])) {
            $query->where('tipo_vehiculo', 'like', '%' . $params['tipo'] . '%');
        }
        if (!empty($params['placa'])) {
            $query->where('placa', 'like', '%' . $params['placa'] . '%');
        }

        $vehiculos = $query->orderBy('id', 'desc')->get();

        return $this->json($response, [
            'success' => true,
            'data'    => $vehiculos,
        ]);
    }

    /**
     * Obtener un vehiculo por id.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $vehiculo = Vehiculo::find($args['id']);

        if (!$vehiculo) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Vehiculo no encontrado',
            ], 404);
        }

        return $this->json($response, [
            'success' => true,
            'data'    => $vehiculo,
        ]);
    }

    /**
     * Crear un vehiculo.
     */
    public function store(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();

        $errores = $this->validar($data);
        if (!empty($errores)) {
            return $this->json($response, [
                'success' => false,
                'message' => $errores[0],
            ], 400);
        }

        // Placa unica
        if (Vehiculo::where('placa', $data['placa'])->exists()) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Ya existe un vehiculo con la placa ' . $data['placa'],
            ], 409);
        }

        $vehiculo = Vehiculo::create([
            'placa'           => $data['placa'],
            'tipo_vehiculo'   => $data['tipo_vehiculo'],
            'capacidad_carga' => $data['capacidad_carga'],
            'modelo'          => $data['modelo'],
            'marca'           => $data['marca'],
            'estado'          => $data['estado'] ?? 'disponible',
        ]);

        return $this->json($response, [
            'success' => true,
            'message' => 'Vehiculo creado correctamente',
            'data'    => $vehiculo,
        ], 201);
    }

    /**
     * Editar un vehiculo existente.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $vehiculo = Vehiculo::find($args['id']);

        if (!$vehiculo) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Vehiculo no encontrado',
            ], 404);
        }

        $data = (array) $request->getParsedBody();

        $errores = $this->validar($data);
        if (!empty($errores)) {
            return $this->json($response, [
                'success' => false,
                'message' => $errores[0],
            ], 400);
        }

        // Placa unica, excluyendo el propio registro
        $placaDuplicada = Vehiculo::where('placa', $data['placa'])
            ->where('id', '!=', $vehiculo->id)
            ->exists();
        if ($placaDuplicada) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Ya existe otro vehiculo con la placa ' . $data['placa'],
            ], 409);
        }

        $vehiculo->update([
            'placa'           => $data['placa'],
            'tipo_vehiculo'   => $data['tipo_vehiculo'],
            'capacidad_carga' => $data['capacidad_carga'],
            'modelo'          => $data['modelo'],
            'marca'           => $data['marca'],
            'estado'          => $data['estado'] ?? $vehiculo->estado,
        ]);

        return $this->json($response, [
            'success' => true,
            'message' => 'Vehiculo actualizado correctamente',
            'data'    => $vehiculo,
        ]);
    }

    /**
     * Eliminar un vehiculo.
     */
    public function destroy(Request $request, Response $response, array $args): Response
    {
        $vehiculo = Vehiculo::find($args['id']);

        if (!$vehiculo) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Vehiculo no encontrado',
            ], 404);
        }

        $vehiculo->delete();

        return $this->json($response, [
            'success' => true,
            'message' => 'Vehiculo eliminado correctamente',
        ]);
    }

    /**
     * Validaciones obligatorias del examen.
     * Retorna un arreglo de mensajes de error (vacio si todo es valido).
     */
    private function validar(array $data): array
    {
        $errores = [];

        $requeridos = ['placa', 'tipo_vehiculo', 'capacidad_carga', 'modelo', 'marca'];
        foreach ($requeridos as $campo) {
            if (!isset($data[$campo]) || $data[$campo] === '' || $data[$campo] === null) {
                $errores[] = "El campo '$campo' es obligatorio";
                return $errores; // detener en el primer faltante
            }
        }

        // Capacidad debe ser mayor a cero
        if (!is_numeric($data['capacidad_carga']) || (float) $data['capacidad_carga'] <= 0) {
            $errores[] = 'La capacidad de carga debe ser un numero mayor a cero';
            return $errores;
        }

        // Estado valido (si se envia)
        if (isset($data['estado']) && $data['estado'] !== '' && !in_array($data['estado'], Vehiculo::ESTADOS, true)) {
            $errores[] = 'El estado no es valido. Debe ser: ' . implode(', ', Vehiculo::ESTADOS);
            return $errores;
        }

        return $errores;
    }

    /**
     * Helper para responder JSON con el codigo HTTP indicado.
     */
    private function json(Response $response, array $payload, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
