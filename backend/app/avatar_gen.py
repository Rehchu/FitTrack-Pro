from PIL import Image, ImageDraw
from io import BytesIO

def generate_avatar_png(client_name: str, weight: float | None = None, size: tuple[int,int]=(512,512)) -> bytes:
    """Generate a simple avatar PNG placeholder that reflects weight.

    This is a lightweight placeholder pipeline. It draws a stylized silhouette whose
    width changes depending on the weight parameter. Returns PNG bytes.
    """
    w, h = size
    img = Image.new('RGBA', (w, h), (255,255,255,0))
    draw = ImageDraw.Draw(img)

    # Background circle
    draw.ellipse((20, 20, w-20, h-20), fill=(240,248,255,255))

    # Map weight to body width: choose a default if None
    base = 120
    if weight is None:
        body_width = base
    else:
        # reasonable mapping: 50kg -> 100, 120kg -> 180
        body_width = int(max(80, min(220, 100 + (weight - 60) * 1.0)))

    # Center position
    cx = w // 2
    top = 120

    # Head
    head_r = 40
    draw.ellipse((cx-head_r, top, cx+head_r, top+2*head_r), fill=(255,224,189,255))

    # Body rectangle representing torso; width varies with weight
    body_h = 220
    body_w = body_width
    left = cx - body_w//2
    right = cx + body_w//2
    body_top = top + 2*head_r + 10
    body_bottom = body_top + body_h
    draw.rounded_rectangle((left, body_top, right, body_bottom), radius=30, fill=(120,170,110,255))

    # Simple legs
    leg_w = int(body_w*0.25)
    gap = 10
    leg_left = cx - leg_w - gap
    leg_right = cx + gap
    leg_top = body_bottom
    leg_bottom = leg_top + 80
    draw.rectangle((leg_left, leg_top, leg_left+leg_w, leg_bottom), fill=(90,130,90,255))
    draw.rectangle((leg_right, leg_top, leg_right+leg_w, leg_bottom), fill=(90,130,90,255))

    # Name label
    label_y = h - 40
    draw.text((20, label_y), client_name or "Client", fill=(30,30,30,255))

    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.read()
