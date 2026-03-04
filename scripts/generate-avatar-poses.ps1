param(
    [string]$BaseImage = "assets/images/soniya_full.png",
    [string]$OutDir = "assets/images"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = [Math]::Max(1, $Radius * 2)

    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Fill-RoundedRect {
    param(
        [System.Drawing.Graphics]$G,
        [System.Drawing.Color]$Color,
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $path = New-RoundedRectPath -X $X -Y $Y -Width $Width -Height $Height -Radius $Radius
    try {
        $brush = New-Object System.Drawing.SolidBrush($Color)
        try {
            $G.FillPath($brush, $path)
        } finally {
            $brush.Dispose()
        }
    } finally {
        $path.Dispose()
    }
}

function Draw-Glow {
    param(
        [System.Drawing.Graphics]$G,
        [int]$A,
        [int]$R,
        [int]$Gv,
        [int]$B,
        [float]$X,
        [float]$Y,
        [float]$W,
        [float]$H
    )

    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($A, $R, $Gv, $B))
    try {
        $G.FillEllipse($brush, $X, $Y, $W, $H)
    } finally {
        $brush.Dispose()
    }
}

if (!(Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$base = [System.Drawing.Bitmap]::new($BaseImage)
try {
    $w = $base.Width
    $h = $base.Height

    $poses = @('phone', 'reading', 'relax', 'sleep', 'office')

    foreach ($pose in $poses) {
        $canvas = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $gfx = [System.Drawing.Graphics]::FromImage($canvas)
            try {
                $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
                $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $gfx.Clear([System.Drawing.Color]::Transparent)

                switch ($pose) {
                    'phone' {
                        Draw-Glow -G $gfx -A 88 -R 123 -Gv 239 -B 255 -X 610 -Y 690 -W 250 -H 340
                    }
                    'reading' {
                        Draw-Glow -G $gfx -A 84 -R 255 -Gv 196 -B 120 -X 220 -Y 760 -W 320 -H 320
                    }
                    'relax' {
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(115, 104, 84, 150)) -X 252 -Y 1080 -Width 520 -Height 185 -Radius 34
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(98, 149, 122, 190)) -X 295 -Y 1035 -Width 92 -Height 62 -Radius 20
                        Draw-Glow -G $gfx -A 70 -R 211 -Gv 170 -B 255 -X 240 -Y 990 -W 560 -H 340
                    }
                    'sleep' {
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(106, 92, 116, 162)) -X 210 -Y 1110 -Width 610 -Height 210 -Radius 44
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(112, 184, 205, 255)) -X 228 -Y 1088 -Width 168 -Height 78 -Radius 26
                        Draw-Glow -G $gfx -A 64 -R 161 -Gv 187 -B 255 -X 188 -Y 1020 -W 650 -H 360

                        $moonBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(138, 229, 239, 255))
                        $cutBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                        try {
                            $gfx.FillEllipse($moonBrush, 770, 210, 70, 70)
                            $gfx.FillEllipse($cutBrush, 792, 210, 70, 70)
                        } finally {
                            $moonBrush.Dispose()
                            $cutBrush.Dispose()
                        }
                    }
                    'office' {
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(112, 25, 88, 74)) -X 252 -Y 1100 -Width 520 -Height 148 -Radius 20
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(128, 93, 247, 217)) -X 420 -Y 988 -Width 188 -Height 114 -Radius 16
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(132, 20, 54, 75)) -X 438 -Y 1098 -Width 152 -Height 18 -Radius 8
                        Draw-Glow -G $gfx -A 72 -R 102 -Gv 255 -B 224 -X 280 -Y 930 -W 470 -H 320
                    }
                }

                $gfx.DrawImage($base, 0, 0, $w, $h)

                switch ($pose) {
                    'phone' {
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(210, 20, 36, 74)) -X 680 -Y 856 -Width 84 -Height 138 -Radius 16
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(210, 116, 238, 255)) -X 693 -Y 875 -Width 58 -Height 96 -Radius 10
                    }
                    'reading' {
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(210, 101, 52, 132)) -X 272 -Y 914 -Width 108 -Height 106 -Radius 12
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(210, 130, 74, 160)) -X 372 -Y 914 -Width 108 -Height 106 -Radius 12
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(160, 245, 227, 189)) -X 373 -Y 929 -Width 88 -Height 72 -Radius 8
                        Fill-RoundedRect -G $gfx -Color ([System.Drawing.Color]::FromArgb(140, 242, 217, 174)) -X 291 -Y 929 -Width 71 -Height 72 -Radius 8
                    }
                }
            } finally {
                $gfx.Dispose()
            }

            $outPath = Join-Path $OutDir ("soniya_pose_{0}.png" -f $pose)
            $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Output "Generated $outPath"
        } finally {
            $canvas.Dispose()
        }
    }
} finally {
    $base.Dispose()
}
