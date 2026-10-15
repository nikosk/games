"""Run with: blender --python blender/start_mcp.py (requires a GUI display)."""
import bpy
import addon_utils

addon_utils.enable('blender_mcp', default_set=True, persistent=True)
prefs = bpy.context.preferences.addons['blender_mcp'].preferences
prefs.telemetry_consent = False
bpy.context.scene.blendermcp_auto_start_server = True
bpy.context.scene.blendermcp_port = 9876
bpy.ops.wm.save_userpref()
print('Bunny authoring: Blender MCP enabled on localhost:9876', flush=True)
