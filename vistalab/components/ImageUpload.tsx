import React, { useRef, useState } from 'react';

type CropImage = { url: string; width: number; height: number };
type Pan = { x: number; y: number };

function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choose an image file.'));
  if (file.size > 12 * 1024 * 1024) return Promise.reject(new Error('Choose an image smaller than 12 MB.'));

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxSide = 720;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not process this image.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/webp', 0.7);
      URL.revokeObjectURL(objectUrl);
      if (dataUrl.length > 280_000) {
        reject(new Error('This image is still too large after compression. Try a smaller image.'));
        return;
      }
      resolve(dataUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read this image.'));
    };
    image.src = objectUrl;
  });
}

function getImageFit(width: number, height: number, zoom: number) {
  const frameRatio = 2;
  const imageRatio = width / height;
  const fitWidth = imageRatio >= frameRatio ? 100 * zoom : (imageRatio / frameRatio) * 100 * zoom;
  const fitHeight = imageRatio >= frameRatio ? (frameRatio / imageRatio) * 100 * zoom : 100 * zoom;
  return { width: fitWidth, height: fitHeight };
}

export function ImageUpload({ label, image, lang, onChange, crop = false }: {
  label: string;
  image?: string;
  lang: 'EN' | 'KH';
  onChange: (image: string) => void | Promise<void>;
  crop?: boolean;
}) {
  const [error, setError] = useState('');
  const [cropImage, setCropImage] = useState<CropImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const isKhmer = lang === 'KH';
  const cropText = (english: string, khmer: string) => isKhmer ? khmer : english;
  const closeCrop = () => {
    if (cropImage) URL.revokeObjectURL(cropImage.url);
    setCropImage(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const saveCrop = async () => {
    if (!cropImage) return;
    setProcessing(true);
    setError('');
    try {
      const imageElement = new Image();
      if (/^https?:\/\//i.test(cropImage.url)) imageElement.crossOrigin = 'anonymous';
      imageElement.src = cropImage.url;
      await imageElement.decode();
      const fitScale = Math.min(720 / cropImage.width, 360 / cropImage.height);
      const drawWidth = cropImage.width * fitScale * zoom;
      const drawHeight = cropImage.height * fitScale * zoom;
      const drawX = 720 / 2 + (pan.x / 100) * 720 - drawWidth / 2;
      const drawY = 360 / 2 + (pan.y / 100) * 360 - drawHeight / 2;
      let dataUrl = '';
      for (const size of [720, 576, 480]) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size / 2;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not process this image.');
        const scale = size / 720;
        context.drawImage(imageElement, drawX * scale, drawY * scale, drawWidth * scale, drawHeight * scale);
        for (const quality of [0.82, 0.68, 0.54, 0.4]) {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (dataUrl.length <= 280_000) break;
        }
        if (dataUrl.length <= 280_000) break;
      }
      if (dataUrl.length > 280_000) throw new Error('This logo is too detailed to fit the upload limit. Try a smaller image.');
      await onChange(dataUrl);
      closeCrop();
    } catch (cropError) {
      const message = cropError instanceof Error ? cropError.message : 'Image processing failed.';
      setError(message.includes('tainted') || (cropError instanceof DOMException && cropError.name === 'SecurityError')
        ? cropText('This hosted logo cannot be cropped in the browser. Choose the original logo file above, crop it, then save the brand.', 'រូបសញ្ញាដែលបានផ្ទុកនេះមិនអាចកាត់នៅក្នុងកម្មវិធីរុករកបានទេ។ សូមជ្រើសរើសឯកសាររូបសញ្ញាដើមខាងលើ កាត់រូបភាព រួចរក្សាទុកម៉ាក។')
        : message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="block text-xs font-bold text-slate-700">
        {label}
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full rounded-xl border border-slate-300 p-2 text-xs"
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setError('');
            try {
              if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
              if (crop) {
                if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
                const url = URL.createObjectURL(file);
                const probe = new Image();
                probe.onload = () => {
                  setCropImage({ url, width: probe.naturalWidth, height: probe.naturalHeight });
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                };
                probe.onerror = () => {
                  URL.revokeObjectURL(url);
                  setError('Could not read this image.');
                };
                probe.src = url;
              } else {
                onChange(await compressImage(file));
              }
            } catch (uploadError) {
              const message = uploadError instanceof Error ? uploadError.message : 'Image upload failed.';
              setError(isKhmer
                ? (message.includes('12 MB') ? 'សូមជ្រើសរើសរូបភាពដែលមានទំហំតិចជាង 12 MB។' : message.includes('image file') ? 'សូមជ្រើសរើសឯកសាររូបភាព។' : 'មិនអាចដំណើរការរូបភាពនេះបានទេ។')
                : message);
            }
            input.value = '';
          }}
        />
      </label>
      {crop && <p className="text-[11px] text-slate-500">{cropText('Use crop and zoom to make your logo fill the same frame as the others.', 'ប្រើការកាត់ និងពង្រីក ដើម្បីឱ្យរូបសញ្ញាមានទំហំស្មើរូបផ្សេងៗ។')}</p>}
      {image && (
        <div className="flex items-center gap-3">
          <img src={image} alt="Upload preview" className={`rounded-lg border border-slate-200 object-contain ${crop ? 'h-16 w-32 bg-white' : 'h-16 w-20'}`} />
          {crop && <button type="button" onClick={() => {
            const probe = new Image();
            if (/^https?:\/\//i.test(image)) probe.crossOrigin = 'anonymous';
            probe.onload = () => { setCropImage({ url: image, width: probe.naturalWidth, height: probe.naturalHeight }); setZoom(1); setPan({ x: 0, y: 0 }); };
            probe.onerror = () => setError(cropText('This image cannot be edited from its current location. Please upload the logo file again.', 'មិនអាចកែរូបភាពនេះពីទីតាំងបច្ចុប្បន្នបានទេ។ សូមបញ្ចូលឯកសាររូបសញ្ញាម្ដងទៀត។'));
            probe.src = image;
          }} className="text-xs font-semibold text-green-800 hover:underline">{cropText('Adjust crop', 'កែសម្រួលការកាត់រូប')}</button>}
          <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-red-700 hover:underline">{isKhmer ? 'លុបរូបភាព' : 'Remove image'}</button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      {cropImage && crop && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !processing) closeCrop(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="logo-crop-title" className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div>
              <h3 id="logo-crop-title" className="text-lg font-extrabold text-slate-900">{cropText('Adjust logo crop', 'កែសម្រួលការកាត់រូបសញ្ញា')}</h3>
              <p className="mt-1 text-sm text-slate-600">{cropText('Drag the image to position it. Use the slider to zoom.', 'អូសរូបភាពដើម្បីកំណត់ទីតាំង ហើយប្រើរបារដើម្បីពង្រីក។')}</p>
            </div>

            <div
              className="relative aspect-[2/1] touch-none select-none overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-green-50 cursor-grab active:cursor-grabbing"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
              }}
              onPointerMove={(event) => {
                if (!dragStart.current) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const fit = getImageFit(cropImage.width, cropImage.height, zoom);
                const maxX = Math.max(0, (fit.width - 100) / 2);
                const maxY = Math.max(0, (fit.height - 100) / 2);
                const nextX = dragStart.current.panX + ((event.clientX - dragStart.current.x) / rect.width) * 100;
                const nextY = dragStart.current.panY + ((event.clientY - dragStart.current.y) / rect.height) * 100;
                setPan({ x: Math.max(-maxX, Math.min(maxX, nextX)), y: Math.max(-maxY, Math.min(maxY, nextY)) });
              }}
              onPointerUp={() => { dragStart.current = null; }}
              onPointerCancel={() => { dragStart.current = null; }}
            >
              <img
                src={cropImage.url}
                alt={cropText('Logo crop preview', 'មើលរូបសញ្ញាមុនពេលកាត់')}
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{
                  width: `${getImageFit(cropImage.width, cropImage.height, zoom).width}%`,
                  height: `${getImageFit(cropImage.width, cropImage.height, zoom).height}%`,
                  left: `${50 + pan.x - getImageFit(cropImage.width, cropImage.height, zoom).width / 2}%`,
                  top: `${50 + pan.y - getImageFit(cropImage.width, cropImage.height, zoom).height / 2}%`
                }}
              />
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              <span className="flex items-center justify-between"><span>{cropText('Zoom', 'ពង្រីក')}</span><span>{zoom.toFixed(1)}×</span></span>
              <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => { setZoom(Number(event.target.value)); setPan({ x: 0, y: 0 }); }} className="mt-2 w-full accent-green-700" />
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={processing} onClick={closeCrop} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-60">{cropText('Cancel', 'បោះបង់')}</button>
              <button type="button" disabled={processing} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-60">{cropText('Reset', 'កំណត់ឡើងវិញ')}</button>
              <button type="button" disabled={processing} onClick={() => void saveCrop()} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60">{processing ? cropText('Saving…', 'កំពុងរក្សាទុក…') : cropText('Use this crop', 'ប្រើរូបភាពនេះ')}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
