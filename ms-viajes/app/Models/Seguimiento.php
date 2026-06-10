<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Seguimiento extends Model
{
    protected $table = 'seguimientos_viajes';

    protected $fillable = [
        'programacion_viaje_id',
        'fecha',
        'hora',
        'estado',
        'novedad',
    ];

    // Un seguimiento pertenece a una programacion de viaje
    public function programacion()
    {
        return $this->belongsTo(Programacion::class, 'programacion_viaje_id');
    }
}
