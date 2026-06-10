<?php

namespace App\Controllers;

use App\Models\Ruta;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class RutasController
{
    /**
     * Listar rutas. Filtros opcionales: ?ciudad=  (busca en origen o destino)
     */
    public function index(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $query = Ruta::query();

        if (!empty($params['ciudad'])) {
            $ciudad = $params['ciudad'];
            $query->where(function ($q) use ($ciudad) {
                $q->where('ciudad_origen', 'like', "%$ciudad%")
                  ->orWhere('ciudad_destino', 'like', "%$ciudad%");
            });
        }
        if (!empty($params['origen'])) {
            $query->where('ciudad_origen', 'like', '%' . $params['origen'] . '%');
        }
        if (!empty($params['destino'])) {
            $query->where('ciudad_destino', 'like', '%' . $params['destino'] . '%');
        }

        $rutas = $query->orderBy('id', 'desc')->get();

        return $this->json($response, [
            'success' => true,
            'data'    => $rutas,
        ]);
    }

    /**
     * Obtener una ruta por id.
     */
    public function show(Request $request, Response $response, array $args): Response
    {
        $ruta = Ruta::find($args['id']);

        if (!$ruta) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Ruta no encontrada',
            ], 404);
        }

        return $this->json($response, [
            'success' => true,
            'data'    => $ruta,
        ]);
    }

    /**
     * Crear una ruta.
     */
    public function store(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();

        $error = $this->validar($data);
        if ($error !== null) {
            return $this->json($response, ['success' => false, 'message' => $error], 400);
        }

        // No permitir rutas duplicadas (mismo origen y destino)
        if ($this->existeRuta($data['ciudad_origen'], $data['ciudad_destino'])) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Ya existe una ruta de ' . $data['ciudad_origen'] . ' a ' . $data['ciudad_destino'],
            ], 409);
        }

        $ruta = Ruta::create([
            'ciudad_origen'   => $data['ciudad_origen'],
            'ciudad_destino'  => $data['ciudad_destino'],
            'distancia'       => $data['distancia'],
            'tiempo_estimado' => $data['tiempo_estimado'],
            'observaciones'   => $data['observaciones'] ?? null,
        ]);

        return $this->json($response, [
            'success' => true,
            'message' => 'Ruta creada correctamente',
            'data'    => $ruta,
        ], 201);
    }

    /**
     * Editar una ruta existente.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $ruta = Ruta::find($args['id']);

        if (!$ruta) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Ruta no encontrada',
            ], 404);
        }

        $data = (array) $request->getParsedBody();

        $error = $this->validar($data);
        if ($error !== null) {
            return $this->json($response, ['success' => false, 'message' => $error], 400);
        }

        // No permitir rutas duplicadas, excluyendo la propia
        if ($this->existeRuta($data['ciudad_origen'], $data['ciudad_destino'], $ruta->id)) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Ya existe otra ruta de ' . $data['ciudad_origen'] . ' a ' . $data['ciudad_destino'],
            ], 409);
        }

        $ruta->update([
            'ciudad_origen'   => $data['ciudad_origen'],
            'ciudad_destino'  => $data['ciudad_destino'],
            'distancia'       => $data['distancia'],
            'tiempo_estimado' => $data['tiempo_estimado'],
            'observaciones'   => $data['observaciones'] ?? null,
        ]);

        return $this->json($response, [
            'success' => true,
            'message' => 'Ruta actualizada correctamente',
            'data'    => $ruta,
        ]);
    }

    /**
     * Eliminar una ruta.
     */
    public function destroy(Request $request, Response $response, array $args): Response
    {
        $ruta = Ruta::find($args['id']);

        if (!$ruta) {
            return $this->json($response, [
                'success' => false,
                'message' => 'Ruta no encontrada',
            ], 404);
        }

        $ruta->delete();

        return $this->json($response, [
            'success' => true,
            'message' => 'Ruta eliminada correctamente',
        ]);
    }

    /**
     * Validaciones obligatorias. Retorna el primer mensaje de error o null.
     */
    private function validar(array $data): ?string
    {
        $requeridos = ['ciudad_origen', 'ciudad_destino', 'distancia', 'tiempo_estimado'];
        foreach ($requeridos as $campo) {
            if (!isset($data[$campo]) || $data[$campo] === '' || $data[$campo] === null) {
                return "El campo '$campo' es obligatorio";
            }
        }

        // Distancia debe ser mayor a cero
        if (!is_numeric($data['distancia']) || (float) $data['distancia'] <= 0) {
            return 'La distancia debe ser un numero mayor a cero';
        }

        // Origen y destino no pueden ser iguales
        if (strcasecmp(trim($data['ciudad_origen']), trim($data['ciudad_destino'])) === 0) {
            return 'La ciudad de origen y destino no pueden ser iguales';
        }

        return null;
    }

    /**
     * Verifica si ya existe una ruta con el mismo origen y destino.
     */
    private function existeRuta(string $origen, string $destino, ?int $excluirId = null): bool
    {
        $query = Ruta::whereRaw('LOWER(ciudad_origen) = ?', [mb_strtolower(trim($origen))])
            ->whereRaw('LOWER(ciudad_destino) = ?', [mb_strtolower(trim($destino))]);

        if ($excluirId !== null) {
            $query->where('id', '!=', $excluirId);
        }

        return $query->exists();
    }

    private function json(Response $response, array $payload, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
