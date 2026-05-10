<?php

namespace App\Actions;

use App\Models\UploadedImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class ProcessUploadedImage
{
    public function handle(UploadedFile $file, string $directory, string $disk = 'public'): UploadedImage
    {
        $exifData = $this->readExif($file);
        $path = $this->processAndStore($file, $directory, $disk);

        return UploadedImage::create([
            'path' => $path,
            'disk' => $disk,
            'exif_data' => $exifData,
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readExif(UploadedFile $file): ?array
    {
        if (! in_array($file->getMimeType(), ['image/jpeg', 'image/tiff'], true)) {
            return null;
        }

        $data = @exif_read_data($file->getRealPath(), null, true, false);

        return is_array($data) ? $data : null;
    }

    private function processAndStore(UploadedFile $file, string $directory, string $disk): string
    {
        $filename = $file->hashName();
        $path = "{$directory}/{$filename}";

        if ($file->getMimeType() === 'image/gif') {
            $file->storeAs($directory, $filename, $disk);

            return $path;
        }

        $maxDimension = (int) config('thinkstream.images.max_dimension', 2048);
        $manager = new ImageManager(new Driver);
        $image = $manager->read($file->getRealPath());

        if ($image->width() > $maxDimension || $image->height() > $maxDimension) {
            $image->scaleDown(width: $maxDimension, height: $maxDimension);
        }

        Storage::disk($disk)->put($path, (string) $image->encode());

        return $path;
    }
}
