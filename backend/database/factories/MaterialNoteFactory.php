<?php

namespace Database\Factories;

use App\Models\Material;
use App\Models\MaterialNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MaterialNote>
 */
class MaterialNoteFactory extends Factory
{
    protected $model = MaterialNote::class;

    public function definition(): array
    {
        return [
            'material_id' => Material::factory(),
            'page_number' => null,
            'title' => $this->faker->sentence(3),
            'content' => $this->faker->paragraph(),
            'note_type' => 'general',
        ];
    }
}
