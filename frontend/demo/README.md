# Demo Video Folder

Put your MP4 files here. They are served by nginx at `/demo/filename.mp4`.

## How to assign videos to cameras

In the main dashboard (Command page), open the **Camera** drawer, select a camera, and set the **Source** field to the relative path:

```
demo/kitchen_fire.mp4
demo/lobby_normal.mp4
demo/corridor.mp4
```

Then click **Save Source Preset**.

## Suggested file names

| Camera | Location       | Suggested file          |
|--------|----------------|-------------------------|
| cam-01 | Lobby          | `demo/lobby.mp4`        |
| cam-02 | Reception      | `demo/reception.mp4`    |
| cam-03 | Kitchen        | `demo/kitchen_fire.mp4` |
| cam-04 | Corridor A     | `demo/corridor.mp4`     |
| cam-05 | Banquet Hall   | `demo/banquet.mp4`      |
| cam-06 | Stairwell      | `demo/stairwell.mp4`    |

## Tips for the demo

- Put fire/smoke footage on **one** camera (e.g. cam-03 Kitchen) to show a targeted incident
- Keep other cameras on normal office/corridor footage so the contrast is clear
- Videos loop automatically
- Leave source as `0` to use the laptop webcam for that camera instead
