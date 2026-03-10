#!/usr/bin/env python3
"""
后端 API 测试脚本
测试 /init 返回 game_id 和 /gameover 记录游戏结果
使用 Python 内置模块，无需额外安装
"""

import json
import urllib.request
import urllib.error
import os
import sys
import time

SERVER_URL = "http://127.0.0.1:8087"
GAME_RECORDS_DIR = (
    "/Users/tom.chang/code/ai_projects/shake-py/claude-version/game_records"
)


def make_request(endpoint, data=None):
    """发送 HTTP 请求"""
    url = f"{SERVER_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}

    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data else None,
        headers=headers,
        method="POST" if data else "GET",
    )

    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        raise Exception(f"请求失败: {e}")


def test_health_check():
    """测试健康检查接口"""
    print("\n=== 测试健康检查 ===")
    status, data = make_request("/")
    assert status == 200, f"健康检查失败: {status}"
    assert data.get("algorithm") == "phase6-hamilton", "算法名称不匹配"
    print(f"✓ 健康检查通过: {data}")


def test_init_returns_game_id():
    """测试 /init 返回 game_id"""
    print("\n=== 测试 /init 返回 game_id ===")
    status, data = make_request("/init", {"size": 10})
    assert status == 200, f"/init 失败: {status}"

    assert "game_id" in data, "响应中没有 game_id"
    assert data.get("status") == "initialized", "状态不是 initialized"
    assert data.get("size") == 10, "size 不匹配"

    game_id = data["game_id"]
    print(f"✓ /init 返回 game_id: {game_id}")
    return game_id


def test_move(game_id: str):
    """测试 /move 接口"""
    print("\n=== 测试 /move ===")
    status, data = make_request(
        "/move",
        {
            "headX": 1,
            "headY": 0,
            "body": [{"x": 0, "y": 0}],
            "foodX": 5,
            "foodY": 5,
            "size": 10,
        },
    )
    assert status == 200, f"/move 失败: {status}"

    assert "direction" in data, "响应中没有 direction"
    assert data.get("algorithm") == "phase6-hamilton", "算法不匹配"
    print(f"✓ /move 返回方向: {data['direction']}")


def test_gameover(game_id: str):
    """测试 /gameover 接口"""
    print("\n=== 测试 /gameover ===")
    status, data = make_request(
        "/gameover",
        {
            "game_id": game_id,
            "score": 25,
            "steps": 150,
            "food_eaten": 25,
            "death_reason": "碰撞",
            "death_x": 3,
            "death_y": 4,
        },
    )
    assert status == 200, f"/gameover 失败: {status}"

    assert data.get("status") == "recorded", "状态不是 recorded"
    assert data.get("game_id") == game_id, "game_id 不匹配"
    print(f"✓ /gameover 记录成功: {data}")


def test_gameover_saves_json(game_id: str):
    """测试 /gameover 是否保存 JSON 文件"""
    print("\n=== 测试游戏结果 JSON 保存 ===")

    # 等待一下确保文件已保存
    time.sleep(0.5)

    json_file = f"{GAME_RECORDS_DIR}/{game_id}.json"

    assert os.path.exists(json_file), f"JSON 文件未生成: {json_file}"

    with open(json_file, "r", encoding="utf-8") as f:
        record = json.load(f)

    assert record["game_id"] == game_id, "game_id 不匹配"
    assert record["score"] == 25, "score 不匹配"
    assert record["steps"] == 150, "steps 不匹配"
    assert record["food_eaten"] == 25, "food_eaten 不匹配"
    assert record["death_reason"] == "碰撞", "death_reason 不匹配"
    assert record["death_position"]["x"] == 3, "death_x 不匹配"
    assert record["death_position"]["y"] == 4, "death_y 不匹配"
    assert "start_time" in record, "缺少 start_time"
    assert "end_time" in record, "缺少 end_time"

    print(f"✓ JSON 文件保存成功: {json_file}")
    print(f"  内容: {json.dumps(record, indent=2, ensure_ascii=False)}")


def test_gameover_invalid_game_id():
    """测试 /gameover 无效 game_id"""
    print("\n=== 测试 /gameover 无效 game_id ===")
    status, data = make_request(
        "/gameover",
        {
            "game_id": "invalid-id-12345",
            "score": 10,
            "steps": 100,
            "food_eaten": 10,
            "death_reason": "测试",
            "death_x": 0,
            "death_y": 0,
        },
    )
    assert status == 404, f"应该返回 404，实际: {status}"
    print(f"✓ 无效 game_id 正确返回 404")


def test_full_flow():
    """完整流程测试"""
    print("\n=== 测试完整流程 ===")

    # 1. 初始化
    status, data = make_request("/init", {"size": 10})
    game_id = data["game_id"]
    print(f"  初始化 game_id: {game_id}")

    # 2. 模拟几步移动
    for i in range(5):
        make_request(
            "/move",
            {
                "headX": 1 + i,
                "headY": 0,
                "body": [{"x": i, "y": 0}],
                "foodX": 5,
                "foodY": 5,
                "size": 10,
            },
        )
    print(f"  模拟 5 步移动")

    # 3. 游戏结束
    status, data = make_request(
        "/gameover",
        {
            "game_id": game_id,
            "score": 10,
            "steps": 100,
            "food_eaten": 10,
            "death_reason": "测试完成",
            "death_x": 5,
            "death_y": 5,
        },
    )
    assert status == 200
    print(f"  游戏结束上报成功")

    # 4. 验证 JSON
    time.sleep(0.5)
    json_file = f"{GAME_RECORDS_DIR}/{game_id}.json"
    assert os.path.exists(json_file), "JSON 文件未生成"
    print(f"  ✓ 完整流程测试通过")


def main():
    print("=" * 50)
    print("后端 API 测试开始")
    print("=" * 50)

    # 确保目录存在
    os.makedirs(GAME_RECORDS_DIR, exist_ok=True)

    try:
        # 测试1: 健康检查
        test_health_check()

        # 测试2: init 返回 game_id
        game_id = test_init_returns_game_id()

        # 测试3: move 接口
        test_move(game_id)

        # 测试4: gameover 接口
        test_gameover(game_id)

        # 测试5: JSON 文件保存
        test_gameover_saves_json(game_id)

        # 测试6: 无效 game_id
        test_gameover_invalid_game_id()

        # 测试7: 完整流程
        test_full_flow()

        print("\n" + "=" * 50)
        print("✓ 所有测试通过!")
        print("=" * 50)
        return 0

    except AssertionError as e:
        print(f"\n✗ 测试失败: {e}")
        return 1
    except urllib.error.URLError as e:
        print(f"\n✗ 无法连接到服务器 {SERVER_URL}")
        print(f"错误: {e}")
        print("请先启动服务器: python3 phase6_server.py")
        return 1
    except Exception as e:
        print(f"\n✗ 未知错误: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
