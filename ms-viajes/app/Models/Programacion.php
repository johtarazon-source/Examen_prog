<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Programacion extends Model
{
    protected $table = 'programaciones_viajes';

    protected $fillable = [
        'conductor_id',
        'vehiculo_id',
        'ruta_id',
        'fecha_salida',
        'hora_salida',
        'fecha_estimada_llegada',
        'observaciones',
        'estado',
    ];

    // Estados posibles de un viaje
    public const ESTADOS = [
        'programado',
        'en_transito',
        'retrasado',
        'finalizado',
        'cancelado',
    ];

    // Un viaje tiene muchos registros de seguimiento
    public function seguimientos()
    {
        return $this->hasMany(Seguimiento::class, 'programacion_viaje_id');
    }
}
