"""Use the installed MCP server from an already-running assistant session.

python mcp_client.py --info
python mcp_client.py --script /absolute/path/to/script.py
The client uses real MCP initialize/list_tools/call_tool over stdio.
"""
import argparse
import asyncio
import json
import os
from pathlib import Path
from datetime import timedelta
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--script', type=Path)
    parser.add_argument('--info', action='store_true')
    args = parser.parse_args()
    server = Path.home() / '.local/share/bunny-blender-mcp/.venv/bin/mcp-for-blender'
    params = StdioServerParameters(command=str(server), env={**os.environ, 'BLENDER_MCP_DISABLE_TELEMETRY': '1'})
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(minutes=10)) as session:
            await session.initialize()
            if args.script:
                path = str(args.script.resolve())
                code = f"exec(compile(open({path!r}).read(), {path!r}, 'exec'), {{'__file__': {path!r}, '__name__': '__main__'}})"
                result = await session.call_tool('execute_blender_code', {'code': code, 'user_prompt': 'install blender and the blender mcp and install it in this session. then create a demo with the bunny character in 3d. create as many assets/textures you need and create bunny in 3d as faithfuly as possible. dont cut corners, i want a polished character that i can view in 3d. this test will decide if we go this direction so do your best to prove how good it can get, no discounts.'})
            else:
                tools = await session.list_tools()
                print(json.dumps({'connected': True, 'tools': [t.name for t in tools.tools]}))
                result = await session.call_tool('get_scene_info', {})
            for content in result.content:
                if content.type == 'text':
                    print(content.text)
                    if content.text.startswith(('Error executing code:', 'Rejected by safe mode')):
                        raise RuntimeError(content.text)
            if result.isError:
                raise RuntimeError('Blender MCP tool failed')

if __name__ == '__main__':
    asyncio.run(main())
